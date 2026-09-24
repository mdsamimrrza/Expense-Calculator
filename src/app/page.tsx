import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  PieChart,
  Calculator,
  CheckCircle2,
  Cloud,
  Smartphone,
  Download,
  LayoutDashboard,
  FileSpreadsheet,
  Receipt,
  WifiOff,
  Fingerprint,
  ArrowUpRight,
  Wallet,
  Flame,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import QRCode from "react-qr-code";
import { APP_NAME, APP_TAGLINE, APP_DOWNLOAD_URL } from "@/lib/constants";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo } from "@/components/ui/logo";

const ANDROID_FEATURES = [
  { icon: LayoutDashboard, title: "Full dashboard", desc: "Invested, current value and gain/loss at a glance" },
  { icon: TrendingUp, title: "Real returns", desc: "XIRR and SIP streak built from every deposit" },
  { icon: FileSpreadsheet, title: "History + CSV import", desc: "Search, sort and bulk-add your entries" },
  { icon: Receipt, title: "Tax & settlement ledger", desc: "The full 4-section audit breakdown" },
  { icon: WifiOff, title: "Works fully offline", desc: "Optional cloud sync across devices" },
  { icon: Fingerprint, title: "Biometric lock", desc: "Keeps your portfolio private" },
] as const;

export default async function LandingPage() {
  // Redirect logged-in users straight to their dashboard
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 overflow-x-clip">
      {/* Top Navbar */}
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <Logo className="shrink-0 [&>span]:hidden min-[380px]:[&_span]:block" />

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <ThemeToggle />
            <Button variant="ghost" className="hidden sm:inline-flex" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button className="h-9 px-4 text-sm sm:h-10 sm:px-4 sm:text-sm" asChild id="landing-hero-signup">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1">
        <section className="py-12 sm:py-20 lg:py-28 px-4 text-center max-w-5xl mx-auto space-y-5 sm:space-y-6">
          <div className="inline-flex max-w-full items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
            <span className="truncate">Built for Nepali Mutual Fund SIP Investors</span>
          </div>

          <h1 className="text-3xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15] text-balance">
            Track Your Nepali Mutual Fund SIPs with <span className="text-primary">Precision &amp; Clarity</span>
          </h1>

          <p className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto font-normal text-pretty">
            &ldquo;{APP_TAGLINE}&rdquo; Real yearly returns, growth projections, and fee costs you can actually understand, in one clean dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-lg shadow-primary/20" asChild>
              <Link href="/signup">
                Start Tracking Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base" asChild>
              <Link href="/login">Sign In</Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base" asChild>
              <a href={APP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                <Smartphone className="mr-1 h-5 w-5" />
                Get the Android App
              </a>
            </Button>
          </div>

          {/* Quick trust badges */}
          <div className="pt-6 sm:pt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] sm:text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Supports NMB, NIBL, SSIS &amp; more
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Whole-unit allotment, the SEBON way
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Your data stays yours
            </span>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-16 bg-muted/30 border-y border-border/40 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center space-y-2 mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold">Everything you need to master your SIP portfolio</h2>
              <p className="text-sm text-muted-foreground">Replace messy Excel sheets with a dedicated personal mutual fund dashboard.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-3 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">Real Yearly Returns</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your XIRR is worked out from every deposit you have made, on the exact dates you made them. No rough guesses.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-3 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <PieChart className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">Fee Costs Made Visible</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  See how much the yearly fund fee quietly costs you over time, and how it shapes your final payout.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-3 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Calculator className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">Growth Projections</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Look 5, 10, 15, and 20 years ahead, starting from your actual portfolio, not a made-up example.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-3 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">Private by Design</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your numbers are for your eyes only. Only your account can view or change your portfolio.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Cloud vs On-device */}
        <section className="py-16 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center space-y-2 mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold">Cloud or on-device? Your call</h2>
              <p className="text-sm text-muted-foreground">
                Two places your SIP data can live. Start on your phone, move to the cloud later, and nothing gets lost along the way.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-2xl border border-primary/40 bg-primary/5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Cloud className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-lg">Cloud account</h3>
                  <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your portfolio lives in your online account.
                </p>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    Sign in from any device and pick up where you left off
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    Automatic backup. A lost phone never means lost data
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    Needs internet to sign in and sync
                  </li>
                </ul>
              </div>

              <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Smartphone className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-lg">On this phone</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Everything is stored only on your device.
                </p>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    Works fully offline
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    Private: nothing ever leaves the phone
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    No email recovery. A lost phone means lost data
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-6">
              Changed your mind later? Settings → Go Cloud moves on-device data into your cloud account safely, with a confirmation first.
            </p>
          </div>
        </section>

        {/* Android app download */}
        <section id="android-app" className="py-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-gradient-to-br from-primary/10 via-background to-muted/60 p-5 sm:p-12">
              <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
              <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />

              <div className="relative grid lg:grid-cols-[1.05fr_0.95fr] gap-12 items-center">
                {/* Copy, feature tiles and CTA */}
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-widest">
                    <Smartphone className="h-3.5 w-3.5" />
                    <span>Android App</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
                    Take SahakariSIP everywhere: <span className="text-primary">install the Android app</span>
                  </h2>
                  <p className="text-base text-muted-foreground max-w-md">
                    The same SEBON-accurate tracker, built as a fast native app. No browser, no login required. Your ledger lives in your pocket.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ANDROID_FEATURES.map((f) => (
                      <div key={f.title} className="flex items-start gap-3 rounded-2xl border border-border/50 bg-background/70 p-3.5">
                        <div className="h-9 w-9 shrink-0 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                          <f.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold leading-tight">{f.title}</p>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2.5 pt-1">
                    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-4">
                      <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-lg shadow-primary/25 justify-center" asChild>
                        <a href={APP_DOWNLOAD_URL} target="_blank" rel="noopener noreferrer">
                          <Download className="mr-1 h-5 w-5" />
                          Download APK (Free)
                        </a>
                      </Button>
                      <div className="flex items-center gap-3">
                        <div className="shrink-0 rounded-xl bg-white p-2 shadow-sm">
                          <QRCode value={APP_DOWNLOAD_URL} size={64} level="M" />
                        </div>
                        <div className="text-xs text-muted-foreground leading-relaxed">
                          <p className="font-semibold text-foreground">Scan to install</p>
                          <p>Android 7.0+. Direct from GitHub Releases.</p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Allow &ldquo;Install unknown apps&rdquo; when your phone asks. Free, offline-first, no account needed.
                    </p>
                  </div>
                </div>

                {/* Phone mockup: mirrors the APK dashboard (Parchment light theme) */}
                <div className="relative mx-auto w-[260px] max-w-full sm:w-[310px]">
                  <div aria-hidden className="absolute -inset-8 rounded-full bg-primary/10 blur-2xl" />
                  <div className="relative rounded-[2.6rem] border border-border bg-card p-2.5 shadow-2xl">
                    <div className="relative overflow-hidden rounded-[2.1rem] bg-[#EDEAE0]">
                      <div className="absolute left-1/2 top-2 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-[#17241F]/80" />

                      {/* Teal hero: the APK's Portfolio Value header */}
                      <div className="relative overflow-hidden bg-[#147A64] px-4 pb-5 pt-8">
                        <div aria-hidden className="absolute -right-6 -top-10 h-28 w-28 rounded-full bg-white/10" />
                        <div aria-hidden className="absolute -bottom-14 right-10 h-32 w-32 rounded-full bg-[#A8791F]/25" />
                        <div className="absolute right-3 top-7 flex items-center gap-1 rounded-full bg-white px-2.5 py-1 shadow-sm">
                          <span className="text-[10px] font-extrabold text-[#147A64]">3 funds</span>
                          <ChevronDown className="h-3 w-3 text-[#147A64]" strokeWidth={2.6} />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-[10px] bg-white/20">
                            <Wallet className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="text-[8px] font-bold tracking-[0.14em] text-white/85">PORTFOLIO VALUE</span>
                        </div>
                        <p className="mt-1.5 text-[26px] font-black leading-none text-white">NPR 141,350</p>
                        <p className="mt-1 text-[11px] text-white/85">Invested NPR 120,000</p>
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-extrabold text-white">
                            <ArrowUpRight className="h-3 w-3" strokeWidth={2.6} />
                            +21,350 (17.8%)
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-extrabold text-white">
                            <Flame className="h-3 w-3" strokeWidth={2.4} />
                            14-month streak
                          </span>
                        </div>
                      </div>

                      {/* Scroll body */}
                      <div className="space-y-3 p-3">
                        {/* Portfolio Growth card */}
                        <div className="rounded-2xl bg-[#F7F5EC] p-3 shadow-sm">
                          <span className="text-[8px] font-bold tracking-[0.14em] text-[#4B5C55]">PORTFOLIO GROWTH</span>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="text-[17px] font-black text-[#17241F]">NPR 141,350</span>
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#047857]/10 px-1.5 py-0.5 text-[9px] font-extrabold text-[#047857]">
                              <ArrowUpRight className="h-2.5 w-2.5" strokeWidth={2.6} />
                              +17.8%
                            </span>
                          </div>
                          <div className="mt-2 flex gap-0.5 rounded-lg bg-[#E5E2D6] p-0.5">
                            {["1M", "3M", "6M", "1Y", "ALL"].map((r) => (
                              <span
                                key={r}
                                className={
                                  "flex-1 rounded-md py-1 text-center text-[8px] font-extrabold " +
                                  (r === "ALL" ? "bg-[#F7F5EC] text-[#17241F] shadow-sm" : "text-[#4B5C55]")
                                }
                              >
                                {r}
                              </span>
                            ))}
                          </div>
                          <svg viewBox="0 0 200 56" className="mt-2 h-16 w-full" preserveAspectRatio="none" aria-hidden>
                            <path d="M0 48 C 25 45 40 42 55 38 S 100 28 130 20 S 180 9 200 5 L 200 56 L 0 56 Z" fill="#147A64" fillOpacity="0.1" />
                            <path d="M0 48 C 25 45 40 42 55 38 S 100 28 130 20 S 180 9 200 5" fill="none" stroke="#147A64" strokeWidth="2.5" strokeLinecap="round" />
                            <circle cx="200" cy="5" r="3" fill="#147A64" />
                          </svg>
                        </div>

                        {/* NAV history card, partially visible like a scrolling feed */}
                        <div className="rounded-2xl bg-[#F7F5EC] p-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-bold tracking-[0.14em] text-[#4B5C55]">NAV HISTORY</span>
                            <span className="text-[9px] font-extrabold text-[#147A64]">Edit</span>
                          </div>
                          <div className="mt-2 flex items-end justify-between gap-1">
                            {[14, 18, 12, 20, 16, 22, 19, 26].map((h, i) => (
                              <div
                                key={i}
                                className="w-full rounded-t-[3px]"
                                style={{
                                  height: h,
                                  backgroundColor: i === 7 ? "#A8791F" : "rgba(20, 122, 100, 0.35)",
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-4 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {APP_NAME}. Personal Mutual Fund Tracker.</p>
          <p>Designed for Nepali open-ended mutual fund investors.</p>
        </div>
      </footer>
    </div>
  );
}
