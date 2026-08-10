"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { ProjectionRow } from "@/lib/types";
import { formatCurrencyWhole } from "@/lib/format";

interface ProjectionTableProps {
  rows: ProjectionRow[];
}

export function ProjectionTable({ rows }: ProjectionTableProps) {
  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Projected Corpus Milestone Breakdown</CardTitle>
        <CardDescription className="text-xs">
          Estimated total portfolio value continuing from your current actual corpus.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Timeframe</TableHead>
                <TableHead className="text-right">Monthly SIP</TableHead>
                <TableHead className="text-right">Corpus Value</TableHead>
                <TableHead className="text-right">Additional Invested</TableHead>
                <TableHead className="text-right">Estimated Gain</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.year}>
                  <TableCell className="font-semibold text-sm">
                    +{row.year} Years
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs tabular-nums">
                    {formatCurrencyWhole(row.monthlySip)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-bold text-primary tabular-nums">
                    {formatCurrencyWhole(row.corpusValue)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground tabular-nums">
                    {formatCurrencyWhole(row.totalInvested)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-positive font-medium tabular-nums">
                    +{formatCurrencyWhole(row.totalGain)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
