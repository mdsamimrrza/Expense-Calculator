// ============================================================
// SahakariSIP - Fund Config Zod Schema
//
// Schedule fields are validated against the centralized fund
// metadata (src/lib/fund-meta.ts) - the only place official
// frequencies and minimums live. Unknown funds are incomplete:
// a schedule can never be verified for them.
// ============================================================

import { z } from "zod";
import { getFundMeta } from "../fund-meta.ts";
import { FREQUENCY_MONTHS } from "../calendar/bs.ts";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Please enter a valid date");

export const fundConfigSchema = z
  .object({
    fund_name: z
      .string()
      .min(1, "Fund name is required")
      .max(100, "Fund name is too long"),
    fee_rate_pct: z
      .number()
      .min(0, "Fee rate cannot be negative")
      .max(10, "Fee rate seems too high. Please verify."),
    start_date: z.coerce.date({
      required_error: "Start date is required",
      invalid_type_error: "Please enter a valid date",
    }),
    monthly_sip: z
      .number()
      .positive("SIP installment amount must be greater than 0"),
    latest_nav: z
      .number({ required_error: "Current NAV is required" })
      .positive("NAV must be greater than 0"),
    // ---- Registered SIP schedule (all-or-nothing, user-confirmed) ----
    frequency: z.enum(["MONTHLY", "QUARTERLY", "SEMI_ANNUALLY", "ANNUALLY"]).optional().nullable(),
    calendar_system: z.enum(["AD", "BS"]).optional().nullable(),
    anchor_date: isoDate.optional().nullable(),
    schedule_verified: z.boolean().optional().default(false),
  })
  .superRefine((data, ctx) => {
    const meta = getFundMeta(data.fund_name);

    // Fund minimum applies when the fund is officially known.
    if (meta && data.monthly_sip < meta.minimumSipAmount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["monthly_sip"],
        message: `${meta.name} requires a minimum SIP of NPR ${meta.minimumSipAmount.toLocaleString("en-IN")}`,
      });
    }

    if (!data.schedule_verified) return;

    if (!meta) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "This fund has no verified official configuration, so its SIP schedule cannot be confirmed",
      });
      return;
    }
    if (!data.frequency || !data.calendar_system || !data.anchor_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["anchor_date"],
        message: "Confirming a schedule requires frequency, calendar system and registered due date",
      });
      return;
    }
    if (!meta.supportedFrequencies.includes(data.frequency)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["frequency"],
        message: `${meta.name} officially supports only: ${meta.supportedFrequencies.map((f) => FREQUENCY_MONTHS[f] === 1 ? "Monthly" : FREQUENCY_MONTHS[f] === 3 ? "Quarterly" : FREQUENCY_MONTHS[f] === 6 ? "Semi-annual" : "Annual").join(", ")}`,
      });
    }
    if (!meta.supportedCalendarSystems.includes(data.calendar_system)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["calendar_system"],
        message: `${meta.name} does not support ${data.calendar_system} schedules`,
      });
    }
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
