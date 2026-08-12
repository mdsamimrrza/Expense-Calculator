"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Loader2, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { deleteEntry } from "@/lib/actions/entries";
import { EntryForm } from "./entry-form";
import type { Entry, FundConfig } from "@/lib/types";
import { formatCurrency, formatDate, formatNav, formatUnits } from "@/lib/format";

interface EntryTableProps {
  entries: Entry[];
  funds: FundConfig[];
  total: number;
}

export function EntryTable({ entries, funds }: EntryTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | "all">(10);

  const router = useRouter();
  const { toast } = useToast();

  const fundMap = useMemo(() => new Map(funds.map((f) => [f.id, f.fund_name])), [funds]);

  // Compute chronological rollover breakdown for each entry
  const breakdownMap = useMemo(() => {
    const sortedAsc = [...entries].sort(
      (a, b) =>
        new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime() ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const map = new Map<string, {
      freshAmount: number;
      carriedRollover: number;
      totalAvailable: number;
      dpFee: number;
      netCash: number;
      unitCost: number;
      remainingRollover: number;
    }>();

    const fundRollovers = new Map<string, number>();

    for (const entry of sortedAsc) {
      const carriedRollover = fundRollovers.get(entry.fund_id) || 0;
      const freshAmount = Number(entry.amount);
      const dpFee = freshAmount >= 5 ? 5 : 0;
      const totalAvailable = freshAmount + carriedRollover;
      const netCash = Math.max(0, totalAvailable - dpFee);
      const unitCost = Number(entry.units) * Number(entry.nav);
      const remainingRollover = Math.max(0, netCash - unitCost);

      fundRollovers.set(entry.fund_id, remainingRollover);

      map.set(entry.id, {
        freshAmount,
        carriedRollover,
        totalAvailable,
        dpFee,
        netCash,
        unitCost,
        remainingRollover,
      });
    }

    return map;
  }, [entries]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const diff = new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime();
      return sortOrder === "asc" ? diff : -diff;
    });
  }, [entries, sortOrder]);

  // Pagination Math
  const totalEntries = sortedEntries.length;
  const effectivePageSize = pageSize === "all" ? totalEntries || 1 : pageSize;
  const totalPages = Math.ceil(totalEntries / effectivePageSize) || 1;
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validCurrentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, totalEntries);
  const paginatedEntries = sortedEntries.slice(startIndex, endIndex);

  async function handleDeleteConfirm() {
    if (!deleteId) return;
    setIsDeleting(true);

    const result = await deleteEntry(deleteId);

    if (result.success) {
      toast({
        title: "Entry deleted",
        description: "The SIP record has been removed.",
      });
      setDeleteId(null);
      router.refresh();
    } else {
      toast({
        title: "Delete failed",
        description: result.error,
        variant: "destructive",
      });
    }

    setIsDeleting(false);
  }

  if (entries.length === 0) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center space-y-3">
          <p className="text-muted-foreground">No SIP entries recorded yet.</p>
          <p className="text-xs text-muted-foreground">
            Click &quot;Add SIP Entry&quot; or &quot;Import CSV&quot; to populate your history.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden sm:block rounded-xl border border-border/50 bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  className="-ml-3 h-8 text-xs font-semibold"
                >
                  Date
                  <ArrowUpDown className="ml-1 h-3 w-3" />
                </Button>
              </TableHead>
              {funds.length > 1 && <TableHead>Fund</TableHead>}
              <TableHead className="text-right">Deposit Amount</TableHead>
              <TableHead className="text-right">NAV</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead className="text-right">Rollover Leftover</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEntries.map((entry) => {
              const b = breakdownMap.get(entry.id);
              return (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {formatDate(entry.purchase_date)}
                  </TableCell>
                  {funds.length > 1 && (
                    <TableCell className="text-muted-foreground text-xs">
                      {fundMap.get(entry.fund_id) || "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatCurrency(Number(entry.amount))}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatNav(Number(entry.nav))}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatUnits(Number(entry.units))}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                    {b ? formatCurrency(b.remainingRollover) : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[180px] truncate">
                    {entry.notes || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <EntryForm
                        funds={funds}
                        entry={entry}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(entry.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View (< sm) */}
      <div className="sm:hidden space-y-3">
        {paginatedEntries.map((entry) => {
          const b = breakdownMap.get(entry.id);
          return (
            <Card key={entry.id} className="border-border/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm">{formatDate(entry.purchase_date)}</p>
                    {funds.length > 1 && (
                      <p className="text-xs text-muted-foreground">{fundMap.get(entry.fund_id)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <EntryForm
                      funds={funds}
                      entry={entry}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteId(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-border/40">
                  <div>
                    <span className="text-muted-foreground block">Deposit</span>
                    <span className="font-mono font-medium">{formatCurrency(Number(entry.amount))}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">NAV</span>
                    <span className="font-mono font-medium">{formatNav(Number(entry.nav))}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Units</span>
                    <span className="font-mono font-medium">{formatUnits(Number(entry.units))}</span>
                  </div>
                </div>
                {b && (
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-border/40 bg-secondary/20 p-2 rounded-lg">
                    <div>
                      <span className="text-muted-foreground block">Carried Rollover:</span>
                      <span className="font-mono text-blue-500 font-medium">+ {formatCurrency(b.carriedRollover)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Total Available:</span>
                      <span className="font-mono font-medium">{formatCurrency(b.totalAvailable)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Net Cash for Units:</span>
                      <span className="font-mono font-medium">{formatCurrency(b.netCash)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Ending Rollover:</span>
                      <span className="font-mono text-emerald-500 font-bold">{formatCurrency(b.remainingRollover)}</span>
                    </div>
                  </div>
                )}
                {entry.notes && (
                  <p className="text-xs text-muted-foreground italic bg-muted/40 p-2 rounded">
                    {entry.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pagination Controls Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 pb-1 px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>
            Showing <strong className="text-foreground">{totalEntries > 0 ? startIndex + 1 : 0}</strong> to{" "}
            <strong className="text-foreground">{endIndex}</strong> of{" "}
            <strong className="text-foreground">{totalEntries}</strong> entries
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = e.target.value === "all" ? "all" : Number(e.target.value);
                setPageSize(val);
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-border/60 bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value="all">All</option>
            </select>
          </div>

          {pageSize !== "all" && totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={validCurrentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 font-medium text-foreground">
                {validCurrentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={validCurrentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete SIP Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this SIP record? This action cannot be undone.
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
    </div>
  );
}
