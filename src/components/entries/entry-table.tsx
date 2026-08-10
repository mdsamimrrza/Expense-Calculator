"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Loader2, ArrowUpDown } from "lucide-react";
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
  const router = useRouter();
  const { toast } = useToast();

  const fundMap = new Map(funds.map((f) => [f.id, f.fund_name]));

  const sortedEntries = [...entries].sort((a, b) => {
    const diff = new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime();
    return sortOrder === "asc" ? diff : -diff;
  });

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
              <TableHead className="text-right">Amount (NPR)</TableHead>
              <TableHead className="text-right">NAV</TableHead>
              <TableHead className="text-right">Units</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEntries.map((entry) => (
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
                <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
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
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card List View (< sm) */}
      <div className="sm:hidden space-y-3">
        {sortedEntries.map((entry) => (
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
                  <span className="text-muted-foreground block">Amount</span>
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
              {entry.notes && (
                <p className="text-xs text-muted-foreground italic bg-muted/40 p-2 rounded">
                  {entry.notes}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
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
