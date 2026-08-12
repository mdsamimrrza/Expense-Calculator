"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { FUND_PRESETS } from "@/lib/constants";
import { createFundConfig } from "@/lib/actions/fund-config";

const STEPS = [
  { title: "Choose Fund", description: "Which fund are you tracking?" },
  { title: "Fee Rate", description: "Annual fee percentage" },
  { title: "Monthly SIP", description: "Your planned monthly investment" },
  { title: "Start Date", description: "When did you start?" },
  { title: "Current NAV", description: "Current market NAV of the fund" },
];

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [fundName, setFundName] = useState("");
  const [customFundName, setCustomFundName] = useState("");
  const [feeRate, setFeeRate] = useState("");
  const [monthlySip, setMonthlySip] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [latestNav, setLatestNav] = useState("10.00");

  const router = useRouter();
  const { toast } = useToast();

  const isCustomFund = fundName === "other";
  const actualFundName = isCustomFund ? customFundName : fundName;

  function handleFundSelect(value: string) {
    setFundName(value);
    if (value !== "other") {
      const preset = FUND_PRESETS.find((f) => f.name === value);
      if (preset) {
        setFeeRate(preset.feeRate.toString());
      }
    } else {
      setFeeRate("");
    }
  }

  function canProceed(): boolean {
    switch (step) {
      case 0:
        return isCustomFund ? customFundName.trim().length > 0 : fundName.length > 0;
      case 1:
        return parseFloat(feeRate) > 0;
      case 2:
        return parseFloat(monthlySip) > 0;
      case 3:
        return startDate.length > 0;
      case 4:
        return parseFloat(latestNav) > 0;
      default:
        return false;
    }
  }

  async function handleSubmit() {
    setIsLoading(true);

    const formData = new FormData();
    formData.set("fund_name", actualFundName);
    formData.set("fee_rate_pct", feeRate);
    formData.set("start_date", startDate);
    formData.set("monthly_sip", monthlySip);
    formData.set("latest_nav", latestNav);

    const result = await createFundConfig(formData);


    if (result.success) {
      toast({
        title: "Welcome to SahakariSIP! 🎉",
        description: "Your fund is set up. Start adding your SIP entries.",
      });
      router.push("/dashboard");
    } else {
      toast({
        title: "Setup failed",
        description: result.error,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i <= step
                  ? "bg-primary w-8"
                  : "bg-muted w-4"
              }`}
            />
          ))}
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">{STEPS[step].title}</CardTitle>
            <CardDescription>{STEPS[step].description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Step 0: Fund selection */}
            {step === 0 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fund-select">Fund</Label>
                  <Select value={fundName} onValueChange={handleFundSelect}>
                    <SelectTrigger id="fund-select">
                      <SelectValue placeholder="Select a fund..." />
                    </SelectTrigger>
                    <SelectContent>
                      {FUND_PRESETS.map((fund) => (
                        <SelectItem key={fund.name} value={fund.name}>
                          {fund.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">
                        Other — enter manually
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {isCustomFund && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="custom-fund-name">Fund Name</Label>
                    <Input
                      id="custom-fund-name"
                      value={customFundName}
                      onChange={(e) => setCustomFundName(e.target.value)}
                      placeholder="Enter fund name"
                    />
                  </div>
                )}
              </>
            )}

            {/* Step 1: Fee rate */}
            {step === 1 && (
              <div className="space-y-2">
                <Label htmlFor="fee-rate">Annual Fee (%)</Label>
                <Input
                  id="fee-rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={feeRate}
                  onChange={(e) => setFeeRate(e.target.value)}
                  placeholder="e.g. 1.80"
                />
                {fundName && !isCustomFund && (
                  <p className="text-xs text-muted-foreground">
                    Pre-filled from {fundName} — you can edit this if needed
                  </p>
                )}
              </div>
            )}

            {/* Step 2: Monthly SIP */}
            {step === 2 && (
              <div className="space-y-2">
                <Label htmlFor="monthly-sip">Monthly SIP Amount (NPR)</Label>
                <Input
                  id="monthly-sip"
                  type="number"
                  min="0"
                  step="100"
                  value={monthlySip}
                  onChange={(e) => setMonthlySip(e.target.value)}
                  placeholder="e.g. 5000"
                />
              </div>
            )}

            {/* Step 3: Start date */}
            {step === 3 && (
              <div className="space-y-2">
                <Label htmlFor="start-date">SIP Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>
            )}

            {/* Step 4: Current NAV */}
            {step === 4 && (
              <div className="space-y-2">
                <Label htmlFor="current-nav">Current NAV (NPR)</Label>
                <Input
                  id="current-nav"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={latestNav}
                  onChange={(e) => setLatestNav(e.target.value)}
                  placeholder="e.g. 10.50"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Current market NAV for tracking portfolio valuation and returns.
                </p>
              </div>
            )}

          </CardContent>

          <CardFooter className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(step - 1)}
              disabled={step === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isLoading}
                id="onboarding-submit"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Start tracking
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
