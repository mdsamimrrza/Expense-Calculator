import { Mail } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <Card className="border-border/50 shadow-xl text-center">
      <CardHeader className="space-y-4">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary/10">
          <Mail className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-xl">Check your email</CardTitle>
        <CardDescription className="text-base">
          We&apos;ve sent you a verification link. Please check your email and
          click the link to verify your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Didn&apos;t receive the email? Check your spam folder or{" "}
          <Link href="/signup" className="text-primary hover:underline font-medium">
            try signing up again
          </Link>
          .
        </p>
        <Link
          href="/login"
          className="inline-block text-sm text-primary hover:underline font-medium"
        >
          ← Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
