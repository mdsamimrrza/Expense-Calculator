"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name?: string;
  className?: string;
}

/**
 * Shared avatar: remote photo wins, initial letter fallback.
 * Mirrors the APK's `useProfilePhotoUri` resolution — if the photo URL
 * fails to load (expired provider URL, deleted upload), it falls back
 * to the initial instead of showing a broken image.
 */
export function Avatar({ src, name, className }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  const initial = ((name || "S").trim().charAt(0) || "S").toUpperCase();

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={name || "Profile photo"}
        onError={() => setFailed(true)}
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    <div
      aria-label={name || "Profile"}
      className={cn(
        "flex items-center justify-center bg-secondary font-bold text-foreground",
        className
      )}
    >
      {initial}
    </div>
  );
}
