"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import type { ActionResult } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseSecret = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";

const AVATAR_BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

function storageAdmin() {
  return createClient(supabaseUrl, supabaseSecret);
}

function usersAdmin() {
  return createClient(supabaseUrl, supabaseSecret, {
    db: { schema: "next_auth" },
  });
}

async function getUserId(): Promise<string | null> {
  const session = await auth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ?? null;
}

/**
 * Reads the live profile (name + image) straight from next_auth.users.
 * Used by server components so the avatar never depends on a stale
 * session JWT minted before the photo was added.
 */
export async function getProfile(): Promise<{
  name: string | null;
  image: string | null;
  email: string | null;
}> {
  const userId = await getUserId();
  if (!userId) return { name: null, image: null, email: null };

  const { data } = await usersAdmin()
    .from("users")
    .select("name, image, email")
    .eq("id", userId)
    .limit(1)
    .single();

  return {
    name: (data?.name as string | null) ?? null,
    image: (data?.image as string | null) ?? null,
    email: (data?.email as string | null) ?? null,
  };
}

export async function updateProfileImage(
  formData: FormData
): Promise<ActionResult<{ image: string }>> {
  const userId = await getUserId();
  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "No file selected" };
  }
  if (!(ALLOWED_TYPES as readonly string[]).includes(file.type)) {
    return { success: false, error: "Only JPG, PNG or WebP images are allowed" };
  }
  if (file.size > MAX_BYTES) {
    return { success: false, error: "Image must be under 2MB" };
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/avatar.${ext}`;
  const sb = storageAdmin();

  // Remove any previously uploaded avatar files for this user (e.g. old extension)
  try {
    const { data: existing } = await sb.storage.from(AVATAR_BUCKET).list(userId);
    const stale = (existing ?? [])
      .filter((f) => f.name !== `avatar.${ext}`)
      .map((f) => `${userId}/${f.name}`);
    if (stale.length > 0) {
      await sb.storage.from(AVATAR_BUCKET).remove(stale);
    }
  } catch {
    // best-effort cleanup only
  }

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await sb.storage
    .from(AVATAR_BUCKET)
    .upload(path, Buffer.from(bytes), {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: pub } = sb.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  const imageUrl = `${pub.publicUrl}?v=${Date.now()}`;

  const { error: dbError } = await usersAdmin()
    .from("users")
    .update({ image: imageUrl })
    .eq("id", userId);

  if (dbError) {
    return { success: false, error: dbError.message };
  }

  revalidatePath("/settings");
  return { success: true, data: { image: imageUrl } };
}

export async function removeProfileImage(): Promise<ActionResult<{ image: null }>> {
  const userId = await getUserId();
  if (!userId) {
    return { success: false, error: "Not authenticated" };
  }

  const sb = storageAdmin();
  try {
    const { data: existing } = await sb.storage.from(AVATAR_BUCKET).list(userId);
    const paths = (existing ?? []).map((f) => `${userId}/${f.name}`);
    if (paths.length > 0) {
      await sb.storage.from(AVATAR_BUCKET).remove(paths);
    }
  } catch {
    // best-effort cleanup only
  }

  const { error: dbError } = await usersAdmin()
    .from("users")
    .update({ image: null })
    .eq("id", userId);

  if (dbError) {
    return { success: false, error: dbError.message };
  }

  revalidatePath("/settings");
  return { success: true, data: { image: null } };
}
