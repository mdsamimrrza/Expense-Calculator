"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createFundConfig, updateFundConfig, deleteFundConfig } from "@/lib/actions/fund-config";
import type { FundConfig } from "@/lib/types";
import { formatCurrencyWhole, formatDate } from "@/lib/format";

interface FundConfigFormProps {
  funds: FundConfig[];
}

export function FundConfigForm({ funds }: FundConfigFormProps) {
  const [open, setOpen] = useState(false);
  const [editingFund, setEditingFund] = useState<FundConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [fundName, setFundName] = useState("");
  const [feeRate, setFeeRate] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [monthlySip, setMonthlySip] = useState("");

  const router = useRouter();
  const { toast } = useToast();

  function openEdit(fund: FundConfig) {
    setEditingFund(fund);
    setFundName(fund.fund_name);
    setFeeRate(fund.fee_rate_pct.toString());
    setStartDate(fund.start_date);
    setMonthlySip(fund.monthly_sip.toString());
    setOpen(true);
  }

  function openCreate() {
    setEditingFund(null);
    setFundName("");
    setFeeRate("1.80");
    setStartDate(new Date().toISOString().split("T")[0]);
    setMonthlySip("5000");
    setOpen(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.set("fund_name", fundName);
    formData.set("fee_rate_pct", feeRate);
    formData.set("start_date", startDate);
    formData.set("monthly_sip", monthlySip);

    const result = editingFund
      ? await updateFundConfig(editingFund.id, formData)
      : await createFundConfig(formData);

    if (result.success) {
      toast({
        title: editingFund ? "Fund updated" : "Fund added 🎉",
        description: `${fundName} settings saved successfully.`,
      });
      setOpen(false);
      router.refresh();
    } else {
      toast({
        title: "Action failed",
        description: result.error,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  }

  async function handleDelete(id: string) {
    setIsLoading(true);
    const result = await deleteFundConfig(id);

    if (result.success) {
      toast({
        title: "Fund removed",
        description: "Fund configuration deleted.",
      });
      setDeletingId(null);
      router.refresh();
    } else {
      toast({
        title: "Deletion blocked",
        description: result.error,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Fund Configurations</CardTitle>
          <CardDescription className="text-xs">
            Manage your tracked mutual funds, fee percentages, and planned monthly SIP amounts.
          </CardDescription>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add Fund
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {funds.map((fund) => (
          <div
            key={fund.id}
            className="flex items-center justify-between p-3.5 rounded-lg border border-border/50 bg-card hover:bg-accent/40 transition-colors"
          >
            <div className="space-y-0.5">
              <h4 className="font-semibold text-sm">{fund.fund_name}</h4>
              <p className="text-xs text-muted-foreground">
                Fee: <strong className="text-foreground">{fund.fee_rate_pct}%</strong> | Planned SIP:{" "}
                <strong className="text-foreground">{formatCurrencyWhole(Number(fund.monthly_sip))}</strong> | Started:{" "}
                {formatDate(fund.start_date)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(fund)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => setDeletingId(fund.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}

        {/* Add/Edit Modal */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{editingFund ? "Edit Fund" : "Add Fund Config"}</DialogTitle>
              <DialogDescription>
                Configure annual fee % and planned monthly investment.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="fund-name-input">Fund Name</Label>
                <Input
                  id="fund-name-input"
                  value={fundName}
                  onChange={(e) => setFundName(e.target.value)}
                  placeholder="e.g. NMB Saral Bachat Fund-E"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fee-rate-input">Annual Fee (%)</Label>
                <Input
                  id="fee-rate-input"
                  type="number"
                  step="0.01"
                  min="0"
                  max="10"
                  value={feeRate}
                  onChange={(e) => setFeeRate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sip-amount-input">Planned Monthly SIP (NPR)</Label>
                <Input
                  id="sip-amount-input"
                  type="number"
                  min="100"
                  value={monthlySip}
                  onChange={(e) => setMonthlySip(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date-input">Start Date</Label>
                <Input
                  id="start-date-input"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingFund ? "Save Changes" : "Add Fund"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <Dialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Delete Fund Configuration</DialogTitle>
              <DialogDescription>
                Are you sure? Note: A fund with existing SIP entries cannot be deleted until all entries are deleted first.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingId(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => deletingId && handleDelete(deletingId)}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Fund
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
