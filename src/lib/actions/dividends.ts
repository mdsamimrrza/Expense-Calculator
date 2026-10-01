"use server";

import { createClient } from "@/lib/supabase/server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { dividendSchema } from "@/lib/schemas/dividend";
import { DIVIDEND_TDS_PCT } from "@/lib/constants";
import type { ActionResult, Dividend } from "@/lib/types";

// Face value of one mutual fund unit in Nepal - the dividend % is
// declared against this, so 7% = Rs 0.70 per unit.
const FACE_VALUE_PER_UNIT = 10;

export async function createDividend(
  formData: FormData
): Promise<ActionResult<Dividend>> {
  const rawData = {
    fund_id: formData.get("fund_id") as string,
    record_date: formData.get("record_date") as string,
    dividend_pct: parseFloat(formData.get("dividend_pct") as string),
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = dividendSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify the fund belongs to this user before writing anything into it.
  const { data: fund } = await supabase
    .from("fund_config")
    .select("start_date")
    .eq("id", parsed.data.fund_id)
    .eq("user_id", user.id)
    .single();

  if (!fund) {
    return { success: false, error: "Fund not found" };
  }

  const recordDateStr = parsed.data.record_date.toISOString().split("T")[0];

  if (recordDateStr < fund.start_date) {
    return {
      success: false,
      error: `Record date cannot be before the fund's start date (${fund.start_date})`,
    };
  }

  // Units held on the book-closure date: every entry bought on or before it.
  // This is the number the AMC actually paid out against.
  const { data: entries, error: entriesError } = await supabase
    .from("entries")
    .select("units")
    .eq("user_id", user.id)
    .eq("fund_id", parsed.data.fund_id)
    .lte("purchase_date", recordDateStr);

  if (entriesError) {
    return { success: false, error: entriesError.message };
  }

  const unitsAtRecord = (entries ?? []).reduce(
    (sum, e) => sum + Number(e.units),
    0
  );

  if (unitsAtRecord <= 0) {
    return {
      success: false,
      error:
        "No units were held on the record date - a dividend can only be recorded against units you already owned.",
    };
  }

  const perUnit = parsed.data.dividend_pct * (FACE_VALUE_PER_UNIT / 100);
  const gross = unitsAtRecord * perUnit;
  const tds = (gross * DIVIDEND_TDS_PCT) / 100;

  const { data, error } = await supabase
    .from("dividends")
    .insert({
      user_id: user.id,
      fund_id: parsed.data.fund_id,
      record_date: recordDateStr,
      dividend_pct: parsed.data.dividend_pct,
      per_unit: perUnit,
      units_at_record: unitsAtRecord,
      gross_amount: gross,
      tds_pct: DIVIDEND_TDS_PCT,
      tds_amount: tds,
      net_amount: gross - tds,
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/tax-breakdown");

  return { success: true, data: data as Dividend };
}

export async function deleteDividend(id: string): Promise<ActionResult> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // CRITICAL: must scope by user_id - the server client bypasses RLS,
  // so this application-level filter is the only thing preventing one
  // user from deleting another user's dividend row.
  const { error, count } = await supabase
    .from("dividends")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  if (count === 0) {
    return { success: false, error: "Dividend not found" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/tax-breakdown");

  return { success: true };
}

export async function getDividends(
  fundId?: string
): Promise<ActionResult<Dividend[]>> {
  const supabase = await createClient();
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  let query = supabase
    .from("dividends")
    .select("*")
    .eq("user_id", user.id)
    .order("record_date", { ascending: false });

  if (fundId && fundId !== "all") {
    query = query.eq("fund_id", fundId);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as Dividend[] };
}
