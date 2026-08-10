"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileSpreadsheet, Loader2, AlertTriangle, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { importEntriesFromCsv } from "@/lib/actions/entries";
import type { FundConfig } from "@/lib/types";

interface CsvImportDialogProps {
  funds: FundConfig[];
  selectedFundId?: string;
}

interface ParsedRow {
  date: string;
  amount: number;
  nav: number;
  units?: number;
  notes?: string;
  isValid: boolean;
  error?: string;
}

export function CsvImportDialog({ funds, selectedFundId }: CsvImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [fundId, setFundId] = useState(selectedFundId || funds[0]?.id || "");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        toast({
          title: "Invalid CSV",
          description: "File contains no data rows.",
          variant: "destructive",
        });
        return;
      }

      // Header parsing
      const header = lines[0].toLowerCase().split(",").map((h) => h.trim());
      const dateIdx = header.findIndex((h) => h.includes("date"));
      const amountIdx = header.findIndex((h) => h.includes("amount"));
      const navIdx = header.findIndex((h) => h.includes("nav"));
      const unitsIdx = header.findIndex((h) => h.includes("unit"));
      const notesIdx = header.findIndex((h) => h.includes("note"));

      if (dateIdx === -1 || amountIdx === -1 || navIdx === -1) {
        toast({
          title: "Missing Required Columns",
          description: "CSV must include 'date', 'amount', and 'nav' headers.",
          variant: "destructive",
        });
        return;
      }

      const parsed: ParsedRow[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        const dateStr = cols[dateIdx] || "";
        const amountNum = parseFloat(cols[amountIdx] || "0");
        const navNum = parseFloat(cols[navIdx] || "0");
        const unitsNum = unitsIdx !== -1 ? parseFloat(cols[unitsIdx] || "0") : undefined;
        const notesStr = notesIdx !== -1 ? cols[notesIdx] : "";

        let isValid = true;
        let error = "";

        if (isNaN(new Date(dateStr).getTime())) {
          isValid = false;
          error = "Invalid date";
        } else if (new Date(dateStr) > new Date()) {
          isValid = false;
          error = "Future date";
        } else if (isNaN(amountNum) || amountNum <= 0) {
          isValid = false;
          error = "Invalid amount";
        } else if (isNaN(navNum) || navNum <= 0) {
          isValid = false;
          error = "Invalid NAV";
        }

        parsed.push({
          date: dateStr,
          amount: amountNum,
          nav: navNum,
          units: unitsNum && unitsNum > 0 ? unitsNum : undefined,
          notes: notesStr,
          isValid,
          error,
        });
      }

      setRows(parsed);
    };

    reader.readAsText(file);
  }

  async function handleImport() {
    const validRows = rows.filter((r) => r.isValid);
    if (validRows.length === 0) return;

    setIsProcessing(true);

    const result = await importEntriesFromCsv(fundId, validRows);

    if (result.success && result.data) {
      toast({
        title: "Import Completed 🎉",
        description: `Successfully imported ${result.data.imported} entries. ${
          result.data.skipped > 0 ? `${result.data.skipped} rows skipped.` : ""
        }`,
      });
      setOpen(false);
      setRows([]);
      setFileName("");
      router.refresh();
    } else {
      toast({
        title: "Import Failed",
        description: result.error || "Failed to process import.",
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  }

  const validCount = rows.filter((r) => r.isValid).length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Import SIP History from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file containing your past SIP purchases. Required columns: date, amount, nav.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col">
          {funds.length > 1 && (
            <div className="space-y-2">
              <Label htmlFor="csv-fund-select">Target Fund</Label>
              <Select value={fundId} onValueChange={setFundId}>
                <SelectTrigger id="csv-fund-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {funds.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.fund_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* File picker */}
          <div className="space-y-2">
            <Label htmlFor="csv-file-input">Select CSV File</Label>
            <Input
              id="csv-file-input"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="cursor-pointer"
            />
            {fileName && (
              <p className="text-xs text-muted-foreground">
                Selected: <strong className="text-foreground">{fileName}</strong>
              </p>
            )}
          </div>

          {/* Preview Table */}
          {rows.length > 0 && (
            <div className="flex-1 overflow-y-auto border border-border rounded-lg max-h-[300px]">
              <Table>
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>NAV</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, idx) => (
                    <TableRow key={idx} className={!row.isValid ? "bg-rose-500/10" : ""}>
                      <TableCell>
                        {row.isValid ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="flex items-center text-xs text-rose-500 gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {row.error}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{row.date}</TableCell>
                      <TableCell className="text-xs font-mono">{row.amount}</TableCell>
                      <TableCell className="text-xs font-mono">{row.nav}</TableCell>
                      <TableCell className="text-xs truncate max-w-[120px]">
                        {row.notes || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {rows.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Ready to import <strong className="text-foreground">{validCount}</strong> valid rows out of {rows.length} total.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={validCount === 0 || isProcessing}
          >
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Import {validCount} Rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
