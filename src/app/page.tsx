import Link from "next/link";
import { ArrowRight, TrendingUp, ShieldCheck, PieChart, Calculator, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME, APP_TAGLINE } from "@/lib/constants";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20">
      {/* Top Navbar */}
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-md">
              S
            </div>
            <span className="font-bold text-xl tracking-tight">{APP_NAME}</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild id="landing-hero-signup">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1">
        <section className="py-20 lg:py-28 px-4 text-center max-w-5xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <span>Built for Nepali Mutual Fund SIP Investors</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
            Track Your Nepali Mutual Fund SIPs with <span className="text-primary">Precision & Clarity</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto font-normal">
            &ldquo;{APP_TAGLINE}&rdquo; Real XIRR returns, portfolio growth projections, and true fee drag insights in one clean dashboard.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base shadow-lg shadow-primary/20" asChild>
              <Link href="/signup">
                Start Tracking Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base" asChild>
              <Link href="/login">Explore Dashboard</Link>
            </Button>
          </div>

          {/* Quick trust badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Support for NMB, NIBL, SSIS & more
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Exact Newton-Raphson XIRR
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Row-Level Security (RLS) Isolation
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
                <h3 className="font-semibold text-lg">Actual XIRR Returns</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Calculates true annualized internal rate of return using exact cash flow dates instead of simple averages.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-3 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <PieChart className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">Fee Drag Visibility</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  See the cumulative cost of annual management, depository, and supervision fees over your investment horizon.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-3 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <Calculator className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">Step-Up Projections</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Simulate portfolio growth at 5, 10, 15, and 20 years seeded directly with your current corpus value.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border/50 bg-card space-y-3 shadow-sm">
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg">Private & Isolated</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Your data is protected by Supabase Row Level Security. Only you can view or modify your portfolio entries.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8 px-4 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} SahakariSIP. Personal Mutual Fund Tracker.</p>
          <p>Designed for Nepali open-ended mutual fund investors.</p>
        </div>
      </footer>
    </div>
  );
}
