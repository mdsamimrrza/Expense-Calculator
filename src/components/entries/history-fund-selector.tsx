"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FundConfig } from "@/lib/types";
import { Filter } from "lucide-react";

interface HistoryFundSelectorProps {
  funds: FundConfig[];
  selectedFundId: string;
  basePath?: string;
}

export function HistoryFundSelector({ funds, selectedFundId, basePath = "/history" }: HistoryFundSelectorProps) {
  const router = useRouter();

  const handleFundChange = (val: string) => {
    router.push(`${basePath}?fund=${val}`);
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-card shadow-sm shrink-0">
        <Filter className="h-4 w-4 text-muted-foreground" />
      </div>
      <Select value={selectedFundId} onValueChange={handleFundChange}>
        <SelectTrigger className="w-full sm:w-[260px] h-9 rounded-xl bg-card font-semibold text-xs border-border/50 shadow-sm">
          <SelectValue placeholder="Filter by fund" />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          <SelectItem value="all" className="text-xs font-semibold">
            All Funds
          </SelectItem>
          {funds.map((f) => (
            <SelectItem key={f.id} value={f.id} className="text-xs font-medium">
              {f.fund_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
