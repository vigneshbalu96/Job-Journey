import { ZodError, type ZodType } from "zod";
import { UnauthorizedError, withUser, type UserContext } from "@/lib/auth";
import { NotFoundError } from "@/lib/repo";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * Standard shape for every server action: parse input with zod, resolve the
 * user, run, and turn known failures into a result the form can render.
 * Unknown errors are rethrown so Next surfaces them.
 */
export function action<S extends ZodType, T>(schema: S, run: (input: S["_output"], ctx: UserContext) => Promise<T>) {
  return async (raw: unknown): Promise<ActionResult<T>> => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return { ok: false, error: "Please fix the highlighted fields", fieldErrors: flatten(parsed.error) };
    }
    try {
      const data = await withUser((ctx) => run(parsed.data, ctx));
      return { ok: true, data };
    } catch (err) {
      if (err instanceof UnauthorizedError) return { ok: false, error: "Please sign in again" };
      if (err instanceof NotFoundError) return { ok: false, error: "That record no longer exists" };
      if (err instanceof ActionError) return { ok: false, error: err.message };
      throw err;
    }
  };
}

/** Throw inside an action to return a user-facing message without a stack trace. */
export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

function flatten(error: ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
