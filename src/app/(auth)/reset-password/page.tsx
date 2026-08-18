import { redirect } from "next/navigation";

export default function ResetPasswordPage() {
  // Reset password is now handled in /forgot-password (3-step OTP flow)
  redirect("/forgot-password");
}
