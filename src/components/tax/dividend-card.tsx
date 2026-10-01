"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createDividend, deleteDividend } from "@/lib/actions/dividends";
import { DIVIDEND_TDS_PCT } from "@/lib/constants";
import { formatCurrencyWhole, formatDate, formatUnits } from "@/lib/format";
import type { Dividend, FundConfig } from "@/lib/types";

interface DividendCardProps {
  dividends: Dividend[];
  funds: FundConfig[];
  /** Fund currently in view ("all" or a fund_config id). */
  selectedFundId: string;
}

export function DividendCard({ dividends, funds, selectedFundId }: DividendCardProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fundId, setFundId] = useState(selectedFundId !== "all" ? selectedFundId : "");
  const [recordDate, setRecordDate] = useState("");
  const [dividendPct, setDividendPct] = useState("");

  const totalNet = dividends.reduce((sum, d) => sum + Number(d.net_amount), 0);
  const totalTds = dividends.reduce((sum, d) => sum + Number(d.tds_amount), 0);
  const fundName = (id: string) => funds.find((f) => f.id === id)?.fund_name ?? "Unknown Fund";

  const pctNum = parseFloat(dividendPct);
  // Nepal rule: dividend % is declared against the Rs 10 face value,
  // so 7% = Rs 0.70 per unit.
  const perUnit = !isNaN(pctNum) && pctNum > 0 ? pctNum * 0.1 : null;

  async function handleSave() {
    if (!fundId) {
      toast({ title: "Select a fund", variant: "destructive" });
      return;
    }
    setIsLoading(true);

    const formData = new FormData();
    formData.set("fund_id", fundId);
    formData.set("record_date", recordDate);
    formData.set("dividend_pct", dividendPct);

    const result = await createDividend(formData);

    if (result.success) {
      toast({
        title: "Dividend recorded",
        description: `${formatCurrencyWhole(Number(result.data?.net_amount))} net credited (after ${DIVIDEND_TDS_PCT}% TDS).`,
      });
      setIsOpen(false);
      setRecordDate("");
      setDividendPct("");
      router.refresh();
    } else {
      toast({ title: "Failed to record dividend", description: result.error, variant: "destructive" });
    }

    setIsLoading(false);
  }

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    setIsDeleting(true);

    const result = await deleteDividend(deleteId);

    if (result.success) {
      toast({ title: "Dividend removed" });
      setDeleteId(null);
      router.refresh();
    } else {
      toast({ title: "Failed to remove dividend", description: result.error, variant: "destructive" });
    }

    setIsDeleting(false);
  }

  const canSave = Boolean(fundId && recordDate && pctNum > 0);

  return (
    <Card className="rounded-[1.75rem] sm:rounded-[2rem] border-border/60 shadow-sm overflow-hidden bg-card">
      <CardHeader className="bg-muted/30 p-4 sm:p-5 border-b border-border/40">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-500/20 shrink-0">
              05
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                Dividend Income
              </CardTitle>
              <CardDescription className="text-[11px] text-muted-foreground">
                Cash the AMC paid out against your units on each book-closure date.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              Net {formatCurrencyWhole(totalNet)}
            </span>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
                  <Plus className="h-3.5 w-3.5 mr-1" /> Record
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md rounded-3xl bg-background border-border">
                <DialogHeader>
                  <DialogTitle className="text-base font-extrabold">Record a Dividend</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Units, gross amount and TDS are computed automatically from your entries.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-1">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">Fund</label>
                    <Select value={fundId} onValueChange={setFundId}>
                      <SelectTrigger className="w-full h-9 rounded-xl text-xs">
                        <SelectValue placeholder="Select fund..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {funds.map((f) => (
                          <SelectItem key={f.id} value={f.id} className="text-xs truncate">
                            {f.fund_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Record (book-closure) date
                    </label>
                    <Input
                      type="date"
                      value={recordDate}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setRecordDate(e.target.value)}
                      className="h-9 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Dividend % (of Rs 10 face value)
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="e.g. 7"
                      value={dividendPct}
                      onChange={(e) => setDividendPct(e.target.value)}
                      className="h-9 rounded-xl text-xs"
                    />
                    {perUnit !== null && (
                      <p className="text-[11px] text-muted-foreground">
                        = NPR {perUnit.toFixed(2)} per unit. Gross, {DIVIDEND_TDS_PCT}% TDS and net are
                        calculated from units you held on that date.
                      </p>
                    )}
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <DialogClose asChild>
                    <Button variant="outline" size="sm" className="rounded-xl">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    size="sm"
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold"
                    onClick={handleSave}
                    disabled={isLoading || !canSave}
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Dividend"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>

      {dividends.length === 0 ? (
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
            <span>
              No dividends recorded yet. When a fund announces a distribution (declared as a % of the
              Rs 10 face value, paid to units held on the book-closure date), record it here and it
              will show up on your dashboard and in this ledger.
            </span>
          </div>
        </CardContent>
      ) : (
        <>
          {/* Desktop Table View */}
          <CardContent className="p-0 hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 bg-muted/10">
                  <TableHead className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Record Date</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Fund</TableHead>
                  <TableHead className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Dividend</TableHead>
                  <TableHead className="text-right text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Units</TableHead>
                  <TableHead className="text-right text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Gross</TableHead>
                  <TableHead className="text-right text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">TDS ({DIVIDEND_TDS_PCT}%)</TableHead>
                  <TableHead className="text-right text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">Net (NPR)</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs">
                {dividends.map((d) => (
                  <TableRow key={d.id} className="border-border/30">
                    <TableCell className="font-medium text-foreground">{formatDate(d.record_date)}</TableCell>
                    <TableCell className="text-muted-foreground">{fundName(d.fund_id)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {Number(d.dividend_pct)}% (NPR {Number(d.per_unit).toFixed(2)}/unit)
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">{formatUnits(Number(d.units_at_record))}</TableCell>
                    <TableCell className="text-right font-mono text-foreground">{formatCurrencyWhole(Number(d.gross_amount))}</TableCell>
                    <TableCell className="text-right font-mono text-amber-400">-{formatCurrencyWhole(Number(d.tds_amount))}</TableCell>
                    <TableCell className="text-right font-mono font-bold text-emerald-400">+{formatCurrencyWhole(Number(d.net_amount))}</TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                        onClick={() => setDeleteId(d.id)}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-emerald-500/5 border-border/40 font-bold">
                  <TableCell colSpan={6} className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    Total Dividend Cash Received (net)
                  </TableCell>
                  <TableCell className="text-right font-mono text-emerald-400">+{formatCurrencyWhole(totalNet)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>

          {/* Mobile Card List View */}
          <div className="p-4 space-y-3 block sm:hidden">
            {dividends.map((d) => (
              <div key={d.id} className="p-3 bg-secondary/40 rounded-xl border border-border/40 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground">{fundName(d.fund_id)}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-rose-500"
                    onClick={() => setDeleteId(d.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{formatDate(d.record_date)} - {Number(d.dividend_pct)}% (NPR {Number(d.per_unit).toFixed(2)}/unit)</span>
                  <span className="font-mono">{formatUnits(Number(d.units_at_record))} units</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Gross {formatCurrencyWhole(Number(d.gross_amount))} - TDS -{formatCurrencyWhole(Number(d.tds_amount))}</span>
                  <span className="font-mono font-bold text-emerald-400">+{formatCurrencyWhole(Number(d.net_amount))}</span>
                </div>
              </div>
            ))}
            <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Total Net Received</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">+{formatCurrencyWhole(totalNet)}</span>
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation - matches the entry-table destructive pattern */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Dividend Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this dividend record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
