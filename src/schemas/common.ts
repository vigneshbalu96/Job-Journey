import { z } from "zod";

export const id = z.uuid();
export const optionalText = z
  .string()
  .trim()
  .max(2000)
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();
export const optionalUrl = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.url().nullable())
  .nullable()
  .optional();
export const optionalDate = z
  .union([z.date(), z.string().trim()])
  .transform((v) => (v === "" || v == null ? null : v instanceof Date ? v : new Date(v)))
  .refine((v) => v === null || !Number.isNaN(v.getTime()), "Invalid date")
  .nullable()
  .optional();
export const optionalMoney = z
  .union([z.number(), z.string().trim()])
  .transform((v) => (v === "" || v == null ? null : String(v)))
  .refine((v) => v === null || /^\d+(\.\d{1,2})?$/.test(v), "Enter a number")
  .nullable()
  .optional();
export const tags = z.array(z.string().trim().min(1).max(40)).max(20).default([]);
export const currency = z.string().length(3).toUpperCase().default("INR");
