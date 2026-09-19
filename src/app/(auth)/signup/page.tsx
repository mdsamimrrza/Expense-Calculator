"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import Link from "next/link";
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
import { signUp, verifySignupOtp } from "@/lib/actions/auth";
import { GoogleButton } from "@/components/auth/google-button";

export default function SignupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const result = await signUp(formData);

    if (result.success) {
      // Account created unverified — confirm the emailed code next.
      setPendingEmail(email);
      toast({
        title: "Check your email",
        description: "We sent a 6-digit confirmation code. It expires in 10 minutes.",
      });
    } else {
      toast({
        title: "Sign up failed",
        description: result.error,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  }

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!pendingEmail) return;
    setIsLoading(true);

    const result = await verifySignupOtp(pendingEmail, otp);

    if (result.success) {
      toast({
        title: "Email confirmed",
        description: "Your account is ready. Please sign in.",
      });
      router.push("/login?registered=1");
    } else {
      toast({
        title: "Confirmation failed",
        description: result.error,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }

  if (pendingEmail) {
    return (
      <Card className="border-border/50 shadow-xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl flex items-center gap-2">
            <MailCheck className="h-5 w-5 text-primary" />
            Confirm your email
          </CardTitle>
          <CardDescription>
            We sent a 6-digit code to <span className="font-medium text-foreground">{pendingEmail}</span>.
            Enter it below to activate your account.
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleVerify}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Confirmation code</Label>
              <Input
                id="otp"
                name="otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="123456"
                required
                autoComplete="one-time-code"
                className="text-center text-lg tracking-[0.5em] font-mono"
                disabled={isLoading}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full font-bold" disabled={isLoading || otp.length !== 6}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Email
            </Button>

            <p className="text-sm text-muted-foreground text-center">
              Wrong address?{" "}
              <button
                type="button"
                className="text-primary hover:underline font-medium"
                onClick={() => {
                  setPendingEmail(null);
                  setOtp("");
                }}
              >
                Go back
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl">Create an account</CardTitle>
        <CardDescription>
          Sign up to start tracking your SIP investments
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Google Sign-Up */}
          <GoogleButton text="Sign up with Google" />

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground font-medium">
                Or sign up with email
              </span>
            </div>
          </div>

          {/* Email */}
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

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                disabled={isLoading}
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

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              required
              minLength={8}
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full font-bold"
            disabled={isLoading}
            id="signup-submit"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Account
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
