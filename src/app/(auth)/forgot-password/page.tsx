"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { forgotPassword } from "@/lib/actions/auth";

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await forgotPassword(formData);

    if (result.success) {
      setEmailSent(true);
    } else {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  }

  if (emailSent) {
    return (
      <Card className="border-border/50 shadow-xl text-center">
        <CardHeader className="space-y-2">
          <CardTitle className="text-xl">Check your email</CardTitle>
          <CardDescription className="text-base">
            We&apos;ve sent a password reset link to your email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/login"
            className="text-sm text-primary hover:underline font-medium"
          >
            ← Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your email address and we&apos;ll send you a reset link
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              autoComplete="email"
              disabled={isLoading}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
            id="forgot-password-submit"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send reset link
          </Button>
          <Link
            href="/login"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to sign in
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
