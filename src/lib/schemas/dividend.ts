// ============================================================
// SahakariSIP - Dividend Zod Schema
// ============================================================

import { z } from "zod";

export const dividendSchema = z.object({
  fund_id: z.string().uuid("Please select a fund"),
  record_date: z.coerce
    .date({
      required_error: "Record date is required",
      invalid_type_error: "Please enter a valid date",
    })
    .refine(
      (date) => date <= new Date(),
      "Record date cannot be in the future"
    ),
  // Declared as % of the Rs 10 face value, e.g. 7 means Rs 0.70/unit.
  dividend_pct: z
    .number({
      required_error: "Dividend percentage is required",
      invalid_type_error: "Dividend percentage must be a number",
    })
    .positive("Dividend percentage must be greater than 0")
    .max(200, "Dividend percentage looks too high"),
  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),
});

export type DividendFormData = z.infer<typeof dividendSchema>;
