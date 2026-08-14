import { redirect } from "next/navigation";

export default function SignupPage() {
  // Magic Links handle both login and signup
  redirect("/login");
}
