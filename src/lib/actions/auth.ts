"use server";

import { auth, signOut as nextAuthSignOut } from "@/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { checkEmailRateLimit } from "@/lib/rate-limit";

export async function signUp(formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string;
  if (email) {
    const rateCheck = checkEmailRateLimit(email);
    if (!rateCheck.success) {
      return { success: false, error: rateCheck.error };
    }
  }

  return { success: false, error: "Email/password signup is disabled. Please use Google Login." };
}

export async function signIn(formData: FormData): Promise<ActionResult> {
  return { success: false, error: "Email/password login is disabled. Please use Google Login." };
}

export async function signOut(): Promise<void> {
  await nextAuthSignOut({ redirectTo: "/" });
}

export async function forgotPassword(
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get("email") as string;
  if (!email) {
    return { success: false, error: "Email address is required." };
  }

  // Rate Limiting: Max 5 email requests per hour per email address
  const rateCheck = checkEmailRateLimit(email);
  if (!rateCheck.success) {
    return { success: false, error: rateCheck.error };
  }

  return { success: false, error: "Password reset is disabled. Please use Google Login." };
}

export async function resetPassword(
  formData: FormData
): Promise<ActionResult> {
  return { success: false, error: "Password reset is disabled. Please use Google Login." };
}

export async function deleteAccount(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .schema("next_auth")
    .from("users")
    .delete()
    .eq("id", session.user.id);

  if (error) {
    return { success: false, error: error.message };
  }
  
  return { success: true };
}
