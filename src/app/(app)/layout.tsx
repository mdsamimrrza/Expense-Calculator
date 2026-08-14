import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <AppShell
      userEmail={session.user.email ?? undefined}
      userName={session.user.name ?? undefined}
    >
      {children}
    </AppShell>
  );
}
