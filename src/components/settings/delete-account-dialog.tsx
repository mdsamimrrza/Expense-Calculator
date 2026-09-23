"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { signOut } from "next-auth/react";
import { deleteAccount } from "@/lib/actions/auth";
import { useRouter } from "next/navigation";

interface DeleteAccountDialogProps {
  fundCount?: number;
  entryCount?: number;
}

export function DeleteAccountDialog({
  fundCount,
  entryCount,
}: DeleteAccountDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const hasCounts = fundCount !== undefined || entryCount !== undefined;

  async function handleDeleteAccount() {
    if (confirmText !== "DELETE") return;
    setIsLoading(true);

    try {
      const result = await deleteAccount();

      if (!result.success) {
        // Fallback if custom RPC isn't deployed yet: sign out user
        await signOut({ callbackUrl: "/login" });
        toast({
          title: "Account sign out triggered",
          description: "Please contact support for complete server-side data purging.",
        });
        router.push("/login");
      } else {
        await signOut({ callbackUrl: "/login" });
        toast({
          title: "Account deleted",
          description: "Your account and portfolio data have been removed.",
        });
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred.",
      });
    }

    setIsLoading(false);
  }

  return (
    <Card className="rounded-2xl border-destructive/30 bg-card shadow-none">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400">
          <AlertTriangle className="h-6 w-6" strokeWidth={2} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-destructive">Delete account</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Permanently delete your account and remove all fund configurations and SIP
            entries.
          </p>
          {hasCounts && (
            <p className="mt-2 text-xs font-medium text-foreground">
              This will erase{" "}
              <strong className="tabular-nums">{fundCount ?? 0}</strong>{" "}
              {fundCount === 1 ? "fund" : "funds"} and{" "}
              <strong className="tabular-nums">{entryCount ?? 0}</strong>{" "}
              {entryCount === 1 ? "entry" : "entries"}.
            </p>
          )}
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setConfirmText("");
          }}
        >
          <DialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full shrink-0 sm:w-auto"
              aria-label="Open account deletion dialog"
            >
              Delete Account
            </Button>
          </DialogTrigger>
          <DialogContent className="overflow-hidden p-0 sm:max-w-[425px]">
            {/* Red-tipped header band */}
            <div className="h-1.5 w-full bg-destructive" />
            <div className="px-6 pb-6 pt-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Delete Account & Data
                </DialogTitle>
                <DialogDescription>
                  This action is <strong className="text-foreground">irreversible</strong>.
                  All your tracked funds, purchase entries, and performance calculations
                  will be permanently purged.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2 py-4">
                <Label htmlFor="confirm-delete">
                  Type{" "}
                  <span className="font-mono font-bold text-destructive">DELETE</span> to
                  confirm:
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="font-mono"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={confirmText !== "DELETE" || isLoading}
                  onClick={handleDeleteAccount}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Permanently Delete
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
