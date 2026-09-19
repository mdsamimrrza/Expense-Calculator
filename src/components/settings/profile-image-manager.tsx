"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { displayNameFor } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { updateProfileImage, removeProfileImage } from "@/lib/actions/profile";

interface ProfileImageManagerProps {
  userName: string;
  userEmail: string;
  initialImage: string | null;
  fundCount: number;
}

export function ProfileImageManager({
  userName,
  userEmail,
  initialImage,
  fundCount,
}: ProfileImageManagerProps) {
  const [image, setImage] = useState<string | null>(initialImage);
  const [isWorking, setIsWorking] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: session, update } = useSession();
  const router = useRouter();
  const { toast } = useToast();

  const displayName = displayNameFor(userName, userEmail);

  async function refreshSession(newImage: string | null) {
    try {
      await update({
        ...session,
        user: { ...session?.user, image: newImage },
      });
    } catch {
      // session refresh is best-effort; server data is already saved
    }
    router.refresh();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsWorking(true);
    const formData = new FormData();
    formData.set("avatar", file);
    const result = await updateProfileImage(formData);

    if (result.success && result.data) {
      setImage(result.data.image);
      await refreshSession(result.data.image);
      toast({ title: "Profile photo updated" });
    } else {
      toast({
        title: "Upload failed",
        description: result.error ?? "Could not update photo.",
        variant: "destructive",
      });
    }
    setIsWorking(false);
  }

  async function handleRemove() {
    setIsWorking(true);
    const result = await removeProfileImage();

    if (result.success) {
      setImage(null);
      await refreshSession(null);
      toast({ title: "Profile photo removed" });
    } else {
      toast({
        title: "Remove failed",
        description: result.error ?? "Could not remove photo.",
        variant: "destructive",
      });
    }
    setIsWorking(false);
  }

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <div className="relative shrink-0">
        <Avatar src={image} name={displayName} className="h-12 w-12 rounded-full text-sm" />
        {isWorking && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
            <Loader2 className="h-4 w-4 animate-spin text-foreground" />
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
        <p className="truncate text-sm text-muted-foreground">{userEmail}</p>
        <div className="mt-1.5 flex items-center gap-3">
          <button
            type="button"
            disabled={isWorking}
            onClick={() => fileRef.current?.click()}
            className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
          >
            {image ? "Change photo" : "Add photo"}
          </button>
          {image && (
            <button
              type="button"
              disabled={isWorking}
              onClick={handleRemove}
              className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <p className="shrink-0 text-sm text-muted-foreground">
        {fundCount} {fundCount === 1 ? "fund" : "funds"}
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
