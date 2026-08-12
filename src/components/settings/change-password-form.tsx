"use client";

import { useState } from "react";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { resetPassword } from "@/lib/actions/auth";

export function ChangePasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.set("password", password);
    formData.set("confirmPassword", confirmPassword);

    const result = await resetPassword(formData);

    if (result && !result.success) {
      toast({
        title: "Password update failed",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Password updated 🎉",
        description: "Your new password has been set.",
      });
      setPassword("");
      setConfirmPassword("");
    }

    setIsLoading(false);
  }

  return (
    <Card className="border-border/60 rounded-[2rem] shadow-sm bg-card overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">Change Password</CardTitle>
        <CardDescription className="text-xs">
          Update your account password securely.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-5 px-6 pb-6">
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs font-semibold">New Password</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Min 8 chars, 1 uppercase, 1 number"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 rounded-xl text-xs"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-new-password" className="text-xs font-semibold">Confirm New Password</Label>
            <Input
              id="confirm-new-password"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-9 rounded-xl text-xs"
              required
            />
          </div>
          <Button type="submit" size="sm" className="h-9 rounded-xl font-bold text-xs" disabled={isLoading || !password}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update Password
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
