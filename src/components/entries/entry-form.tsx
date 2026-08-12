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
import { cn } from "@/lib/utils";

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

  const [useWholeUnits, setUseWholeUnits] = useState(true);
  const [carriedRollover, setCarriedRollover] = useState(0);


  // Fetch carried forward rollover cash when modal opens or fund changes
  useEffect(() => {
    if (open && fundId && !isEdit) {
      import("@/lib/actions/entries").then(({ getFundRolloverCash }) => {
        getFundRolloverCash(fundId).then((res) => {
          if (res.success && typeof res.data === "number") {
            setCarriedRollover(res.data);
          }
        });
      });
    }
  }, [open, fundId, isEdit]);

  // Auto-calculate whole units (integer only)
  useEffect(() => {
    if (!overrideUnits && amount && nav) {
      const a = parseFloat(amount);
      const n = parseFloat(nav);
      if (a > 0 && n > 0) {
        const totalAvail = a + (isEdit ? 0 : carriedRollover);
        const effectiveAmount = deductDpCharge ? Math.max(0, totalAvail - 5) : totalAvail;
        const computedUnits = useWholeUnits ? Math.floor(effectiveAmount / n) : effectiveAmount / n;
        setUnits(useWholeUnits ? computedUnits.toString() : computedUnits.toFixed(4));
      }
    }
  }, [amount, nav, overrideUnits, deductDpCharge, useWholeUnits, carriedRollover, isEdit]);


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
      <DialogContent className="w-[95vw] max-w-md md:max-w-lg lg:max-w-xl rounded-[2rem] p-5 md:p-6 lg:p-7 shadow-xl border-border/60 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left">
          <DialogTitle className="text-base font-extrabold tracking-tight">
            {isEdit ? "Edit SIP Entry" : "Add SIP Entry"}
          </DialogTitle>
          <DialogDescription className="text-xs">
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
            <div className="space-y-1.5">
              <Label htmlFor="entry-date" className="text-xs font-semibold">Purchase Date</Label>
              <Input
                id="entry-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                className="h-9 rounded-xl text-xs"
                required
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="entry-amount" className="text-xs font-semibold">Amount (NPR)</Label>
              <Input
                id="entry-amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="h-9 rounded-xl text-xs"
                required
              />
            </div>

            {/* NAV */}
            <div className="space-y-1.5">
              <Label htmlFor="entry-nav" className="text-xs font-semibold">NAV at Purchase</Label>
              <Input
                id="entry-nav"
                type="number"
                step="0.01"
                min="0.01"
                value={nav}
                onChange={(e) => setNav(e.target.value)}
                placeholder="e.g. 13.25"
                className="h-9 rounded-xl text-xs"
                required
              />
            </div>

            {/* Units */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="entry-units" className="text-xs font-semibold">Units Received</Label>
                <button
                  type="button"
                  className="text-xs text-primary font-medium hover:underline"
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
                className={cn("h-9 rounded-xl text-xs font-bold", !overrideUnits ? "bg-muted/60" : "")}
                required
              />
              {!overrideUnits && amount && nav && (
                <div className="flex flex-col gap-2.5 mt-2 bg-secondary/30 p-3 rounded-xl border border-border/50 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="deduct-dp"
                        checked={deductDpCharge}
                        onChange={(e) => setDeductDpCharge(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="deduct-dp" className="font-normal text-xs text-foreground cursor-pointer">
                        Deduct Rs 5 DP Charge
                      </Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="whole-units"
                        checked={useWholeUnits}
                        onChange={(e) => setUseWholeUnits(e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="whole-units" className="font-normal text-xs text-foreground cursor-pointer">
                        Whole Units (Nepal SIP)
                      </Label>
                    </div>
                  </div>

                  {/* Calculation Breakdown Preview */}
                  {parseFloat(amount) > 0 && parseFloat(nav) > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-border/40 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fresh Deposit Added:</span>
                        <span className="font-semibold text-foreground">NPR {parseFloat(amount).toFixed(2)}</span>
                      </div>
                      
                      {!isEdit && carriedRollover > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">+ Carried-Forward Cash:</span>
                          <span className="font-semibold text-blue-500">NPR {carriedRollover.toFixed(2)}</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between border-t border-border/30 pt-1.5 mt-0.5">
                        <span className="text-muted-foreground font-medium">Total Available Cash:</span>
                        <span className="font-bold text-foreground">NPR {(parseFloat(amount) + (isEdit ? 0 : carriedRollover)).toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">- DP Charge Deducted:</span>
                        <span className="font-medium text-foreground">NPR {deductDpCharge ? "5.00" : "0.00"}</span>
                      </div>

                      <div className="flex justify-between border-t border-border/30 pt-1.5 mt-0.5">
                        <span className="text-muted-foreground font-medium">Net Allotment Cash:</span>
                        <span className="font-bold text-foreground">NPR {Math.max(0, parseFloat(amount) + (isEdit ? 0 : carriedRollover) - (deductDpCharge ? 5 : 0)).toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-muted-foreground">- Unit Cost ({units || 0} units @ {nav}):</span>
                        <span className="font-medium text-foreground">NPR {((parseFloat(units) || 0) * parseFloat(nav)).toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between items-center mt-2 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                        <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                          New Leftover Rollover:
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold text-[12px]">
                          NPR {Math.max(
                            0,
                            parseFloat(amount) +
                              (isEdit ? 0 : carriedRollover) -
                              (deductDpCharge ? 5 : 0) -
                              (parseFloat(units) || 0) * parseFloat(nav)
                          ).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

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

          <DialogFooter className="mt-2">
            <Button type="submit" disabled={isLoading} id="entry-submit" className="w-full h-9 rounded-xl font-bold text-xs">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Update Entry" : "Add Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
