// ============================================================
// SahakariSIP — Fund Config Zod Schema
// ============================================================

import { z } from "zod";

export const fundConfigSchema = z.object({
  fund_name: z
    .string()
    .min(1, "Fund name is required")
    .max(100, "Fund name is too long"),
  fee_rate_pct: z
    .number()
    .min(0, "Fee rate cannot be negative")
    .max(10, "Fee rate seems too high — please verify"),
  start_date: z.coerce.date({
    required_error: "Start date is required",
    invalid_type_error: "Please enter a valid date",
  }),
  monthly_sip: z
    .number()
    .positive("Monthly SIP amount must be greater than 0"),
});

export type FundConfigFormData = z.infer<typeof fundConfigSchema>;

export const updateLatestNavSchema = z.object({
  fund_id: z.string().uuid("Invalid fund ID"),
  latest_nav: z
    .number()
    .positive("NAV must be greater than 0"),
  latest_nav_date: z.coerce.date({
    required_error: "Date is required",
    invalid_type_error: "Please enter a valid date",
  }),
});

export type UpdateLatestNavFormData = z.infer<typeof updateLatestNavSchema>;
