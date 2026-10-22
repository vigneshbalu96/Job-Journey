"use client";

import { useForm, type DefaultValues, type FieldValues, type UseFormProps } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z, ZodType } from "zod";
import type { ActionResult } from "@/lib/action";

/** react-hook-form wired to a zod schema; input and output types tracked separately. */
export function useZodForm<S extends ZodType<FieldValues, FieldValues>>(
  schema: S,
  options?: Omit<UseFormProps<z.input<S>, unknown, z.output<S>>, "resolver">,
) {
  return useForm<z.input<S>, unknown, z.output<S>>({
    // zod v4 schemas type-check against the resolver's generic; the cast keeps
    // the input/output split without fighting the resolver's overloads.
    resolver: zodResolver(schema as never) as never,
    mode: "onBlur",
    ...options,
  });
}

/** Push server-side field errors from an ActionResult back into the form. */
export function applyActionErrors<T>(
  result: ActionResult<T>,
  setError: (name: never, error: { message: string }) => void,
): string | null {
  if (result.ok) return null;
  for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
    setError(field as never, { message: messages[0] });
  }
  return result.error;
}

export type { DefaultValues };
