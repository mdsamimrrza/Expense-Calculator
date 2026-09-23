"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="rounded-2xl border-border bg-card shadow-none">
      <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:items-center sm:gap-5 sm:p-6 sm:text-left">
        <div className="relative shrink-0">
          <Avatar
            src={image}
            name={displayName}
            className="h-20 w-20 rounded-full text-xl"
          />
          <button
            type="button"
            disabled={isWorking}
            onClick={() => fileRef.current?.click()}
            aria-label="Change profile photo"
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm transition-transform active:scale-95 disabled:opacity-50"
          >
            {isWorking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-foreground">
            {displayName}
          </p>
          <p className="truncate text-sm text-muted-foreground">{userEmail}</p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Button
              variant="outline"
              size="sm"
              disabled={isWorking}
              onClick={() => fileRef.current?.click()}
            >
              <Camera className="mr-1.5 h-3.5 w-3.5" />
              {image ? "Change photo" : "Add photo"}
            </Button>
            {image && (
              <Button
                variant="ghost"
                size="sm"
                disabled={isWorking}
                onClick={handleRemove}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        </div>

        <div className="shrink-0 rounded-xl bg-secondary/50 px-4 py-3 text-center">
          <p className="text-lg font-bold tabular-nums text-foreground">
            {fundCount}
          </p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {fundCount === 1 ? "Fund" : "Funds"}
          </p>
        </div>
      </CardContent>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </Card>
  );
}
