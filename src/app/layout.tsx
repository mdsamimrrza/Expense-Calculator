import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register";
import { Toaster } from "@/components/ui/toaster";
import { SplashScreen } from "@/components/ui/splash-screen";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: [
    "SIP tracker",
    "mutual fund",
    "Nepal",
    "investment",
    "portfolio tracker",
    "XIRR",
    "NMB Saral Bachat",
    "NIBL Sahabhagita",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ServiceWorkerRegister />
          <SplashScreen />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
