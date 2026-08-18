"use client";

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Eye, EyeOff, CheckCircle2, Mail, KeyRound, Lock } from "lucide-react";
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
import { forgotPassword, verifyOtp, resetPassword } from "@/lib/actions/auth";

type Step = "email" | "otp" | "password" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Refs for OTP inputs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first OTP box when entering OTP step
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  // ── Step 1: Send OTP ─────────────────────────────
  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const emailVal = (formData.get("email") as string).toLowerCase().trim();

    const result = await forgotPassword(formData);

    if (!result.success) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setEmail(emailVal);
      setStep("otp");
    }

    setIsLoading(false);
  }

  // ── OTP Input Helpers ─────────────────────────────
  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);

    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (otpDigits[index]) {
        const next = [...otpDigits];
        next[index] = "";
        setOtpDigits(next);
      } else if (index > 0) {
        otpRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const next = ["", "", "", "", "", ""];
      pasted.split("").forEach((ch, i) => { next[i] = ch; });
      setOtpDigits(next);
      otpRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  }

  // ── Step 2: Verify OTP ─────────────────────────────
  async function handleOtpSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const code = otpDigits.join("");
    if (code.length !== 6) {
      toast({ title: "Enter all 6 digits", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    const result = await verifyOtp(email, code);

    if (!result.success) {
      toast({
        title: "Invalid code",
        description: result.error,
        variant: "destructive",
      });
      setOtpDigits(["", "", "", "", "", ""]);
      otpRefs.current[0]?.focus();
    } else {
      setResetToken(result.resetToken!);
      setStep("password");
    }

    setIsLoading(false);
  }

  // ── Step 3: Reset Password ─────────────────────────────
  async function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const newPassword = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const result = await resetPassword(email, resetToken, newPassword, confirmPassword);

    if (!result.success) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      setStep("done");
    }

    setIsLoading(false);
  }

  // ── Step Indicators ─────────────────────────────────
  const steps = [
    { key: "email", label: "Email", icon: Mail },
    { key: "otp", label: "Verify", icon: KeyRound },
    { key: "password", label: "Reset", icon: Lock },
  ];
  const stepIndex = step === "done" ? 2 : steps.findIndex((s) => s.key === step);

  // ── DONE State ─────────────────────────────────────
  if (step === "done") {
    return (
      <Card className="border-border/50 shadow-xl text-center">
        <CardHeader className="space-y-2 pb-4">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
          <CardTitle className="text-xl">Password Reset!</CardTitle>
          <CardDescription className="text-base">
            Your password has been updated successfully.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full font-bold" onClick={() => router.push("/login")} id="goto-login-btn">
            Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-xl">
      <CardHeader className="space-y-4">
        {/* Step progress */}
        <div className="flex items-center gap-2">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isComplete = i < stepIndex;
            const isActive = i === stepIndex;
            return (
              <div key={s.key} className="flex items-center gap-2 flex-1 last:flex-none">
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isComplete
                      ? "bg-primary text-primary-foreground"
                      : isActive
                      ? "bg-primary/20 text-primary ring-2 ring-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:block ${
                    isActive ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <div
                    className={`h-px flex-1 transition-all duration-300 ${
                      i < stepIndex ? "bg-primary" : "bg-border/50"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div>
          {step === "email" && (
            <>
              <CardTitle className="text-xl">Forgot password?</CardTitle>
              <CardDescription className="mt-1">
                Enter your email and we&apos;ll send a 6-digit reset code
              </CardDescription>
            </>
          )}
          {step === "otp" && (
            <>
              <CardTitle className="text-xl">Check your email</CardTitle>
              <CardDescription className="mt-1">
                We sent a 6-digit code to <strong className="text-foreground">{email}</strong>
              </CardDescription>
            </>
          )}
          {step === "password" && (
            <>
              <CardTitle className="text-xl">Set new password</CardTitle>
              <CardDescription className="mt-1">
                Choose a strong password for your account
              </CardDescription>
            </>
          )}
        </div>
      </CardHeader>

      {/* ── Step 1: Email Form ───────────────────── */}
      {step === "email" && (
        <form onSubmit={handleEmailSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full font-bold"
              disabled={isLoading}
              id="forgot-email-submit"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Code
            </Button>
            <Link
              href="/login"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Back to sign in
            </Link>
          </CardFooter>
        </form>
      )}

      {/* ── Step 2: OTP Form ─────────────────────── */}
      {step === "otp" && (
        <form onSubmit={handleOtpSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Enter 6-digit code</Label>
              <div className="flex gap-2 justify-between">
                {otpDigits.map((digit, i) => (
                  <Input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    onPaste={i === 0 ? handleOtpPaste : undefined}
                    disabled={isLoading}
                    className="h-12 w-12 text-center text-xl font-bold p-0"
                    id={`otp-digit-${i}`}
                  />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Code expires in 10 minutes. Check your spam folder if you don&apos;t see it.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full font-bold"
              disabled={isLoading || otpDigits.join("").length !== 6}
              id="otp-verify-submit"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify Code
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
              onClick={() => {
                setStep("email");
                setOtpDigits(["", "", "", "", "", ""]);
              }}
            >
              Didn&apos;t receive it? Send again
            </button>
          </CardFooter>
        </form>
      )}

      {/* ── Step 3: New Password Form ─────────────── */}
      {step === "password" && (
        <form onSubmit={handlePasswordSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  autoFocus
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

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter your new password"
                required
                minLength={8}
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full font-bold"
              disabled={isLoading}
              id="reset-password-submit"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reset Password
            </Button>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
