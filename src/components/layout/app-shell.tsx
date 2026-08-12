"use client";

import { useRouter } from "next/navigation";
import { Sidebar } from "./sidebar";
import { BottomTabBar } from "./bottom-tab-bar";
import { Header } from "./header";
import { signOut } from "@/lib/actions/auth";

export function AppShell({ children, userEmail }: { children: React.ReactNode; userEmail?: string }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <Sidebar onSignOut={handleSignOut} userEmail={userEmail} />

      {/* Mobile header */}
      <Header onSignOut={handleSignOut} userEmail={userEmail} />

      {/* Main content area */}
      <main className="lg:pl-64 pb-20 lg:pb-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-0 pb-6 lg:py-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom tab bar */}
      <BottomTabBar />
    </div>
  );
}
