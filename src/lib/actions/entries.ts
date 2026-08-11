"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { entrySchema, csvRowSchema } from "@/lib/schemas/entry";
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Additional server-side validation: check purchase_date >= fund start_date
  const { data: fund } = await supabase
    .from("fund_config")
    .select("start_date")
    .eq("id", parsed.data.fund_id)
    .single();

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
      purchase_date: parsed.data.purchase_date.toISOString().split("T")[0],
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

  const { data, error } = await supabase
    .from("entries")
    .update({
      fund_id: parsed.data.fund_id,
      purchase_date: parsed.data.purchase_date.toISOString().split("T")[0],
      amount: parsed.data.amount,
      nav: parsed.data.nav,
      units: Math.floor(parsed.data.units), // Guaranteed integer
      notes: parsed.data.notes || null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");

  return { success: true, data: data as Entry };
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("entries").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
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

  let query = supabase.from("entries").select("*", { count: "exact" });

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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
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

    const effectiveCash = Math.max(0, parsed.data.amount - 5);
    const units = parsed.data.units ?? Math.floor(effectiveCash / parsed.data.nav);

    validRows.push({
      user_id: user.id,
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

    imported = validRows.length;
  }

  revalidatePath("/dashboard");
  revalidatePath("/history");

  return {
    success: true,
    data: { imported, skipped, errors },
  };
}
