"use client";

import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

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
    <Card className="border-rose-500/20 bg-rose-500/5 rounded-[2rem] overflow-hidden">
      <CardHeader className="px-6 pt-6 pb-4">
        <CardTitle className="text-base font-extrabold text-rose-500 flex items-center gap-2">
          <AlertTriangle className="h-4.5 w-4.5" />
          Danger Zone
        </CardTitle>
        <CardDescription className="text-xs mt-1 font-medium">
          Permanently delete your account and remove all fund configurations and SIP entries.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-6 pb-6 pt-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm" className="rounded-xl font-bold">
              Delete Account
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-destructive flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Delete Account & Data
              </DialogTitle>
              <DialogDescription>
                This action is <strong className="text-foreground">irreversible</strong>. All your tracked funds, purchase entries, and performance calculations will be permanently purged.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Label htmlFor="confirm-delete">
                Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm:
              </Label>
              <Input
                id="confirm-delete"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="font-mono"
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={confirmText !== "DELETE" || isLoading}
                onClick={handleDeleteAccount}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Permanently Delete Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
