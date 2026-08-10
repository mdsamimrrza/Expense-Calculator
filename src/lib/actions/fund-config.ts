"use server";

import { createClient } from "@/lib/supabase/server";
import {
  fundConfigSchema,
  updateLatestNavSchema,
} from "@/lib/schemas/fund-config";
import type { ActionResult, FundConfig } from "@/lib/types";

export async function createFundConfig(
  formData: FormData
): Promise<ActionResult<FundConfig>> {
  const rawData = {
    fund_name: formData.get("fund_name") as string,
    fee_rate_pct: parseFloat(formData.get("fee_rate_pct") as string),
    start_date: formData.get("start_date") as string,
    monthly_sip: parseFloat(formData.get("monthly_sip") as string),
  };

  const parsed = fundConfigSchema.safeParse(rawData);
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

  const { data, error } = await supabase
    .from("fund_config")
    .insert({
      user_id: user.id,
      fund_name: parsed.data.fund_name,
      fee_rate_pct: parsed.data.fee_rate_pct,
      start_date: parsed.data.start_date.toISOString().split("T")[0],
      monthly_sip: parsed.data.monthly_sip,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as FundConfig };
}

export async function updateFundConfig(
  id: string,
  formData: FormData
): Promise<ActionResult<FundConfig>> {
  const rawData = {
    fund_name: formData.get("fund_name") as string,
    fee_rate_pct: parseFloat(formData.get("fee_rate_pct") as string),
    start_date: formData.get("start_date") as string,
    monthly_sip: parseFloat(formData.get("monthly_sip") as string),
  };

  const parsed = fundConfigSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fund_config")
    .update({
      fund_name: parsed.data.fund_name,
      fee_rate_pct: parsed.data.fee_rate_pct,
      start_date: parsed.data.start_date.toISOString().split("T")[0],
      monthly_sip: parsed.data.monthly_sip,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: data as FundConfig };
}

export async function deleteFundConfig(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  // Check if entries exist — block deletion if they do
  const { count, error: countError } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .eq("fund_id", id);

  if (countError) {
    return { success: false, error: countError.message };
  }

  if (count && count > 0) {
    return {
      success: false,
      error: `This fund has ${count} ${count === 1 ? "entry" : "entries"}. Please delete all entries for this fund first.`,
    };
  }

  const { error } = await supabase.from("fund_config").delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function updateLatestNav(
  formData: FormData
): Promise<ActionResult> {
  const rawData = {
    fund_id: formData.get("fund_id") as string,
    latest_nav: parseFloat(formData.get("latest_nav") as string),
    latest_nav_date: formData.get("latest_nav_date") as string,
  };

  const parsed = updateLatestNavSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("fund_config")
    .update({
      latest_nav: parsed.data.latest_nav,
      latest_nav_date: parsed.data.latest_nav_date.toISOString().split("T")[0],
    })
    .eq("id", parsed.data.fund_id);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

export async function getFundConfigs(): Promise<ActionResult<FundConfig[]>> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fund_config")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as FundConfig[] };
}
