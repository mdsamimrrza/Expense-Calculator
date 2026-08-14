"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
import { signIn } from "next-auth/react";
import { GoogleButton } from "@/components/auth/google-button";

function AuthErrorNotifier() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "auth_failed") {
      toast({
        title: "Authentication Failed",
        description: "Google sign-in was cancelled or failed. Please try again.",
        variant: "destructive",
      });
    } else if (error) {
      toast({
        title: "Authentication Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  return null;
}

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    
    if (!email) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await signIn("nodemailer", { 
        email, 
        redirect: false,
        callbackUrl: "/dashboard" 
      });

      if (result?.error) {
        toast({
          title: "Login failed",
          description: result.error,
          variant: "destructive",
        });
      } else {
        setIsEmailSent(true);
        toast({
          title: "Check your email",
          description: "A secure login link has been sent to your email address.",
        });
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-border/50 shadow-xl">
      <Suspense fallback={null}>
        <AuthErrorNotifier />
      </Suspense>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>
          Sign in to your account to continue
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <GoogleButton text="Continue with Google" />

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-medium">
                Or continue with email
              </span>
            </div>
          </div>

          {isEmailSent ? (
            <div className="text-center p-4 bg-primary/10 text-primary rounded-lg font-medium">
              Check your email for the secure login link!
            </div>
          ) : (
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
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          {!isEmailSent && (
            <Button
              type="submit"
              className="w-full font-bold"
              disabled={isLoading}
              id="login-submit"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Login Link
            </Button>
          )}

          <p className="text-sm text-muted-foreground text-center">
            New here? No problem! Just enter your email above to create an account.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

