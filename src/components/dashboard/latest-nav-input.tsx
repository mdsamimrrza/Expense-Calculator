"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { updateLatestNav } from "@/lib/actions/fund-config";
import { formatNav, formatDate } from "@/lib/format";

interface LatestNavInputProps {
  fundId: string;
  currentNav: number | null;
  currentNavDate: string | null;
}

export function LatestNavInput({
  fundId,
  currentNav,
  currentNavDate,
}: LatestNavInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [navValue, setNavValue] = useState(currentNav?.toString() ?? "");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleSave() {
    setIsLoading(true);

    const formData = new FormData();
    formData.set("fund_id", fundId);
    formData.set("latest_nav", navValue);
    formData.set(
      "latest_nav_date",
      new Date().toISOString().split("T")[0]
    );

    const result = await updateLatestNav(formData);

    if (result.success) {
      toast({
        title: "NAV updated",
        description: "Dashboard values have been recalculated.",
      });
      setIsEditing(false);
      router.refresh();
    } else {
      toast({
        title: "Failed to update NAV",
        description: result.error,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Latest NAV:</span>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={navValue}
          onChange={(e) => setNavValue(e.target.value)}
          className="w-24 h-8 text-sm"
          autoFocus
          id="latest-nav-input"
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleSave}
          disabled={isLoading || !navValue || parseFloat(navValue) <= 0}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Check className="h-3.5 w-3.5 text-positive" />
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={() => {
            setIsEditing(false);
            setNavValue(currentNav?.toString() ?? "");
          }}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 whitespace-nowrap bg-secondary/40 px-3 py-1.5 rounded-full border border-border/50">
      <span className="text-xs text-muted-foreground">Latest NAV:</span>
      {currentNav !== null ? (
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-bold tabular-nums text-foreground">
            {formatNav(currentNav)}
          </span>
          {currentNavDate && (
            <span className="text-[10px] text-muted-foreground font-medium">
              ({formatDate(currentNavDate)})
            </span>
          )}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground italic">Not set</span>
      )}
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6 ml-0.5 hover:bg-secondary/80 rounded-full transition-colors"
        onClick={() => setIsEditing(true)}
        id="edit-latest-nav"
      >
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
}
