"use server";

import { createClient } from "@/lib/supabase/server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { entrySchema, csvRowSchema } from "@/lib/schemas/entry";
import { DP_CHARGE } from "@/lib/constants";
import type { ActionResult, Entry, CsvImportResult } from "@/lib/types";

export async function createEntry(
  formData: FormData
): Promise<ActionResult<Entry>> {
  const rawData = {
    fund_id: formData.get("fund_id") as string,
    purchase_date: formData.get("purchase_date") as string,
    amount: parseFloat(formData.get("amount") as string),
    nav: parseFloat(formData.get("nav") as string),
    units: parseFloat(formData.get("units") as string),
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = entrySchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify the fund belongs to this user before doing anything with it —
  // without this check, a user could submit someone else's fund_id and
  // corrupt that fund's latest_nav/nav_history via the update below.
  const { data: fund } = await supabase
    .from("fund_config")
    .select("start_date, latest_nav, latest_nav_date")
    .eq("id", parsed.data.fund_id)
    .eq("user_id", user.id)
    .single();

  if (!fund) {
    return { success: false, error: "Fund not found" };
  }

  const purchaseDateStr = parsed.data.purchase_date.toISOString().split("T")[0];

  if (fund) {
    const purchaseDate = new Date(parsed.data.purchase_date);
    const startDate = new Date(fund.start_date);
    if (purchaseDate < startDate) {
      return {
        success: false,
        error: `Purchase date cannot be before the fund's start date (${fund.start_date})`,
      };
    }
  }

  const { data, error } = await supabase
    .from("entries")
    .insert({
      user_id: user.id,
      fund_id: parsed.data.fund_id,
      purchase_date: purchaseDateStr,
      amount: parsed.data.amount,
      nav: parsed.data.nav,
      units: Math.floor(parsed.data.units), // Guaranteed integer
      notes: parsed.data.notes || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Auto-update fund_config latest_nav if not set or if entry date is newer/equal
  if (fund && (!fund.latest_nav || purchaseDateStr >= (fund.latest_nav_date || ""))) {
    await supabase
      .from("fund_config")
      .update({
        latest_nav: parsed.data.nav,
        latest_nav_date: purchaseDateStr,
      })
      .eq("id", parsed.data.fund_id)
      .eq("user_id", user.id);

    await supabase.from("nav_history").upsert(
      {
        fund_id: parsed.data.fund_id,
        user_id: user.id,
        nav_date: purchaseDateStr,
        nav_value: parsed.data.nav,
      },
      { onConflict: "fund_id,nav_date" }
    );
  }


  revalidatePath("/dashboard");
  revalidatePath("/history");

  return { success: true, data: data as Entry };
}

export async function updateEntry(
  id: string,
  formData: FormData
): Promise<ActionResult<Entry>> {
  const rawData = {
    fund_id: formData.get("fund_id") as string,
    purchase_date: formData.get("purchase_date") as string,
    amount: parseFloat(formData.get("amount") as string),
    nav: parseFloat(formData.get("nav") as string),
    units: parseFloat(formData.get("units") as string),
    notes: (formData.get("notes") as string) || undefined,
  };

  const parsed = entrySchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const purchaseDateStr = parsed.data.purchase_date.toISOString().split("T")[0];

  // Verify the target fund belongs to this user before referencing it
  const { data: fund } = await supabase
    .from("fund_config")
    .select("latest_nav, latest_nav_date")
    .eq("id", parsed.data.fund_id)
    .eq("user_id", user.id)
    .single();

  if (!fund) {
    return { success: false, error: "Fund not found" };
  }

  // CRITICAL: must scope by user_id — the server client uses the service
  // role key (bypasses RLS entirely), so this application-level filter is
  // the only thing preventing one user from editing another user's entry.
  const { data, error } = await supabase
    .from("entries")
    .update({
      fund_id: parsed.data.fund_id,
      purchase_date: purchaseDateStr,
      amount: parsed.data.amount,
      nav: parsed.data.nav,
      units: Math.floor(parsed.data.units), // Guaranteed integer
      notes: parsed.data.notes || null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  await supabase.from("nav_history").upsert(
    {
      fund_id: parsed.data.fund_id,
      user_id: user.id,
      nav_date: purchaseDateStr,
      nav_value: parsed.data.nav,
    },
    { onConflict: "fund_id,nav_date" }
  );

  if (fund && (!fund.latest_nav || purchaseDateStr >= (fund.latest_nav_date || ""))) {
    await supabase
      .from("fund_config")
      .update({
        latest_nav: parsed.data.nav,
        latest_nav_date: purchaseDateStr,
      })
      .eq("id", parsed.data.fund_id)
      .eq("user_id", user.id);
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");

  return { success: true, data: data as Entry };
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // CRITICAL: must scope by user_id — the server client uses the service
  // role key (bypasses RLS entirely), so this application-level filter is
  // the ONLY thing preventing one user from deleting another user's entry.
  const { error, count } = await supabase
    .from("entries")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  if (count === 0) {
    // Either the entry doesn't exist, or it belongs to someone else —
    // don't distinguish the two in the response (avoid leaking existence).
    return { success: false, error: "Entry not found" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");

  return { success: true };
}

interface GetEntriesParams {
  fundId?: string;
  page?: number;
  pageSize?: number;
  sortOrder?: "asc" | "desc";
}

export async function getEntries(
  params: GetEntriesParams = {}
): Promise<ActionResult<{ entries: Entry[]; total: number }>> {
  const { fundId, page = 1, pageSize = 20, sortOrder = "desc" } = params;

  const supabase = await createClient();
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  let query = supabase
    .from("entries")
    .select("*", { count: "exact" })
    .eq("user_id", user.id);

  if (fundId) {
    query = query.eq("fund_id", fundId);
  }

  query = query
    .order("purchase_date", { ascending: sortOrder === "asc" })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const { data, count, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      entries: (data ?? []) as Entry[],
      total: count ?? 0,
    },
  };
}

export async function importEntriesFromCsv(
  fundId: string,
  rows: Array<{
    date: string;
    amount: number;
    nav: number;
    units?: number;
    notes?: string;
  }>
): Promise<ActionResult<CsvImportResult>> {
  const supabase = await createClient();
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Verify the fund belongs to this user before importing anything into it
  const { data: fund, error: fundLookupError } = await supabase
    .from("fund_config")
    .select("latest_nav, latest_nav_date")
    .eq("id", fundId)
    .eq("user_id", user.id)
    .single();

  if (fundLookupError || !fund) {
    return { success: false, error: "Fund not found" };
  }

  let imported = 0;
  let skipped = 0;
  const errors: Array<{ row: number; message: string }> = [];

  const validRows: Array<{
    user_id: string;
    fund_id: string;
    purchase_date: string;
    amount: number;
    nav: number;
    units: number;
    notes: string | null;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const parsed = csvRowSchema.safeParse(row);

    if (!parsed.success) {
      skipped++;
      errors.push({ row: i + 1, message: parsed.error.errors[0].message });
      continue;
    }

    const effectiveCash = Math.max(0, parsed.data.amount - DP_CHARGE);
    const units = parsed.data.units ?? Math.floor(effectiveCash / parsed.data.nav);

    validRows.push({
      user_id: user.id!,
      fund_id: fundId,
      purchase_date: new Date(parsed.data.date).toISOString().split("T")[0],
      amount: parsed.data.amount,
      nav: parsed.data.nav,
      units: Math.floor(units), // Always integer whole units
      notes: parsed.data.notes || null,
    });
  }

  if (validRows.length > 0) {
    const { error } = await supabase.from("entries").insert(validRows);

    if (error) {
      return { success: false, error: error.message };
    }

    const navHistoryRows = validRows.map(row => ({
      fund_id: row.fund_id,
      user_id: row.user_id,
      nav_date: row.purchase_date,
      nav_value: row.nav,
    }));

    await supabase.from("nav_history").upsert(
      navHistoryRows,
      { onConflict: "fund_id,nav_date" }
    );

    const maxDateRow = validRows.reduce((prev, current) => 
      (prev.purchase_date > current.purchase_date) ? prev : current
    );

    if (!fund.latest_nav || maxDateRow.purchase_date >= (fund.latest_nav_date || "")) {
      await supabase
        .from("fund_config")
        .update({
          latest_nav: maxDateRow.nav,
          latest_nav_date: maxDateRow.purchase_date,
        })
        .eq("id", fundId)
        .eq("user_id", user.id);
    }

    imported = validRows.length;
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");

  return {
    success: true,
    data: { imported, skipped, errors },
  };
}

export async function getFundRolloverCash(
  fundId: string
): Promise<ActionResult<number>> {
  const supabase = await createClient();
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: entries, error } = await supabase
    .from("entries")
    .select("amount, nav, units, purchase_date, created_at")
    .eq("user_id", user.id)
    .eq("fund_id", fundId)
    .order("purchase_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  let runningRollover = 0;
  for (const entry of entries || []) {
    const freshAmount = Number(entry.amount);
    const dpFee = freshAmount >= 5 ? 5 : 0;
    const totalAvailable = freshAmount + runningRollover;
    const netCash = Math.max(0, totalAvailable - dpFee);
    const unitCost = Number(entry.units) * Number(entry.nav);
    runningRollover = Math.max(0, netCash - unitCost);
  }

  return { success: true, data: runningRollover };
}

