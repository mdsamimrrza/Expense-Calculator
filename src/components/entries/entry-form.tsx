"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createEntry, updateEntry } from "@/lib/actions/entries";
import type { Entry, FundConfig } from "@/lib/types";

interface EntryFormProps {
  funds: FundConfig[];
  entry?: Entry; // If provided, form is in edit mode
  defaultFundId?: string;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function EntryForm({
  funds,
  entry,
  defaultFundId,
  trigger,
  onSuccess,
}: EntryFormProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fundId, setFundId] = useState(
    entry?.fund_id ?? defaultFundId ?? funds[0]?.id ?? ""
  );
  const [purchaseDate, setPurchaseDate] = useState(
    entry?.purchase_date ?? new Date().toISOString().split("T")[0]
  );
  const [amount, setAmount] = useState(entry?.amount?.toString() ?? "");
  const [nav, setNav] = useState(entry?.nav?.toString() ?? "");
  const [units, setUnits] = useState(entry?.units?.toString() ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [overrideUnits, setOverrideUnits] = useState(false);
  const [deductDpCharge, setDeductDpCharge] = useState(true);

  const router = useRouter();
  const { toast } = useToast();

  const isEdit = !!entry;

  // Auto-calculate units
  useEffect(() => {
    if (!overrideUnits && amount && nav) {
      const a = parseFloat(amount);
      const n = parseFloat(nav);
      if (a > 0 && n > 0) {
        const effectiveAmount = deductDpCharge ? Math.max(0, a - 5) : a;
        setUnits((effectiveAmount / n).toFixed(4));
      }
    }
  }, [amount, nav, overrideUnits, deductDpCharge]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.set("fund_id", fundId);
    formData.set("purchase_date", purchaseDate);
    formData.set("amount", amount);
    formData.set("nav", nav);
    formData.set("units", units);
    formData.set("notes", notes);

    const result = isEdit
      ? await updateEntry(entry.id, formData)
      : await createEntry(formData);

    if (result.success) {
      toast({
        title: isEdit ? "Entry updated" : "Entry added! 🎉",
        description: isEdit
          ? "Your SIP entry has been updated."
          : "Dashboard has been recalculated.",
      });
      setOpen(false);
      onSuccess?.();
      router.refresh();

      // Reset form if creating new
      if (!isEdit) {
        setAmount("");
        setNav("");
        setUnits("");
        setNotes("");
        setPurchaseDate(new Date().toISOString().split("T")[0]);
      }
    } else {
      toast({
        title: isEdit ? "Update failed" : "Failed to add entry",
        description: result.error,
        variant: "destructive",
      });
    }

    setIsLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button id="add-entry-btn">
            <Plus className="mr-2 h-4 w-4" />
            Add SIP Entry
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit SIP Entry" : "Add SIP Entry"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the details of this entry."
              : "Record this month's SIP purchase."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Fund selector */}
            {funds.length > 1 && (
              <div className="space-y-2">
                <Label htmlFor="entry-fund">Fund</Label>
                <Select value={fundId} onValueChange={setFundId}>
                  <SelectTrigger id="entry-fund">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {funds.map((fund) => (
                      <SelectItem key={fund.id} value={fund.id}>
                        {fund.fund_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="entry-date">Purchase Date</Label>
              <Input
                id="entry-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="entry-amount">Amount (NPR)</Label>
              <Input
                id="entry-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                required
              />
            </div>

            {/* NAV */}
            <div className="space-y-2">
              <Label htmlFor="entry-nav">NAV at Purchase</Label>
              <Input
                id="entry-nav"
                type="number"
                step="0.01"
                min="0.01"
                value={nav}
                onChange={(e) => setNav(e.target.value)}
                placeholder="e.g. 13.25"
                required
              />
            </div>

            {/* Units */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="entry-units">Units Received</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setOverrideUnits(!overrideUnits)}
                >
                  {overrideUnits ? "Auto-calculate" : "Override manually"}
                </button>
              </div>
              <Input
                id="entry-units"
                type="number"
                step="0.0001"
                min="0.0001"
                value={units}
                onChange={(e) => setUnits(e.target.value)}
                placeholder="Auto-calculated"
                readOnly={!overrideUnits}
                className={!overrideUnits ? "bg-muted" : ""}
                required
              />
              {!overrideUnits && amount && nav && (
                <div className="flex flex-col gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="deduct-dp"
                      checked={deductDpCharge}
                      onChange={(e) => setDeductDpCharge(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="deduct-dp" className="font-normal text-xs text-muted-foreground cursor-pointer">
                      Deduct Rs 5 DP Charge
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    = {deductDpCharge ? `(${amount} - 5)` : amount} ÷ {nav}
                  </p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="entry-notes">Notes (optional)</Label>
              <Input
                id="entry-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder='e.g. "step-up applied this month"'
                maxLength={500}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isLoading} id="entry-submit">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update Entry" : "Add Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
