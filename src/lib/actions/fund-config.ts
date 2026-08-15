"use server";

import { createClient } from "@/lib/supabase/server";
import { auth } from "@/auth";
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
    latest_nav: parseFloat(formData.get("latest_nav") as string),
  };

  const parsed = fundConfigSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const startDateStr = parsed.data.start_date.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("fund_config")
    .insert({
      user_id: user.id,
      fund_name: parsed.data.fund_name,
      fee_rate_pct: parsed.data.fee_rate_pct,
      start_date: startDateStr,
      monthly_sip: parsed.data.monthly_sip,
      latest_nav: parsed.data.latest_nav,
      latest_nav_date: startDateStr,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  if (data) {
    await supabase.from("nav_history").upsert(
      {
        fund_id: data.id,
        user_id: user.id,
        nav_date: startDateStr,
        nav_value: parsed.data.latest_nav,
      },
      { onConflict: "fund_id,nav_date" }
    );
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
    latest_nav: parseFloat(formData.get("latest_nav") as string),
  };

  const parsed = fundConfigSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const startDateStr = parsed.data.start_date.toISOString().split("T")[0];
  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch existing fund to check if latest_nav changed — scoped to this
  // user so a non-owned fund_id returns null rather than someone else's data
  const { data: existingFund } = await supabase
    .from("fund_config")
    .select("latest_nav, latest_nav_date")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!existingFund) {
    return { success: false, error: "Fund not found" };
  }

  const navChanged = existingFund?.latest_nav !== parsed.data.latest_nav;
  const newNavDate = navChanged ? todayStr : existingFund?.latest_nav_date;

  // CRITICAL: must scope by user_id — the server client uses the service
  // role key (bypasses RLS entirely), so this is the only thing preventing
  // one user from updating another user's fund configuration.
  const { data, error } = await supabase
    .from("fund_config")
    .update({
      fund_name: parsed.data.fund_name,
      fee_rate_pct: parsed.data.fee_rate_pct,
      start_date: startDateStr,
      monthly_sip: parsed.data.monthly_sip,
      latest_nav: parsed.data.latest_nav,
      ...(navChanged && { latest_nav_date: newNavDate }),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  if (navChanged) {
    await supabase.from("nav_history").upsert(
      {
        fund_id: id,
        user_id: user.id,
        nav_date: newNavDate,
        nav_value: parsed.data.latest_nav,
      },
      { onConflict: "fund_id,nav_date" }
    );
  }

  return { success: true, data: data as FundConfig };
}



export async function deleteFundConfig(id: string): Promise<ActionResult> {
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const supabase = await createClient();

  // Check if entries exist — block deletion if they do. Scoped to this
  // user's own fund; also acts as an implicit ownership check below.
  const { count, error: countError } = await supabase
    .from("entries")
    .select("id", { count: "exact", head: true })
    .eq("fund_id", id)
    .eq("user_id", user.id);

  if (countError) {
    return { success: false, error: countError.message };
  }

  if (count && count > 0) {
    return {
      success: false,
      error: `This fund has ${count} ${count === 1 ? "entry" : "entries"}. Please delete all entries for this fund first.`,
    };
  }

  // CRITICAL: must scope by user_id — the server client uses the service
  // role key (bypasses RLS entirely), so this application-level filter is
  // the only thing preventing one user from deleting another user's fund.
  const { error, count: deletedCount } = await supabase
    .from("fund_config")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  if (deletedCount === 0) {
    return { success: false, error: "Fund not found" };
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

  const session = await auth();
  const user = session?.user;

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const navDate = parsed.data.latest_nav_date.toISOString().split("T")[0];

  // CRITICAL: must scope by user_id — the server client uses the service
  // role key (bypasses RLS entirely), so this application-level filter is
  // the only thing preventing one user from overwriting another user's
  // fund NAV. Being logged in is necessary but not sufficient — being the
  // owner of this specific fund_id is what's actually required here.
  const { error, count } = await supabase
    .from("fund_config")
    .update(
      {
        latest_nav: parsed.data.latest_nav,
        latest_nav_date: navDate,
      },
      { count: "exact" }
    )
    .eq("id", parsed.data.fund_id)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  if (count === 0) {
    return { success: false, error: "Fund not found" };
  }

  // Log to nav_history table for historical NAV tracking
  // Upsert by (fund_id, nav_date) so updating same-day NAV overwrites
  await supabase
    .from("nav_history")
    .upsert(
      {
        fund_id: parsed.data.fund_id,
        user_id: user.id,
        nav_date: navDate,
        nav_value: parsed.data.latest_nav,
      },
      { onConflict: "fund_id,nav_date" }
    );

  return { success: true };
}

export async function getFundConfigs(): Promise<ActionResult<FundConfig[]>> {
  const supabase = await createClient();
  const session = await auth();
  const user = session?.user;

  if (!user?.id) {
    return { success: false, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("fund_config")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, data: (data ?? []) as FundConfig[] };
}
