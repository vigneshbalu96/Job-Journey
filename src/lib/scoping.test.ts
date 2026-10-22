import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Guard rail for the two standing rules: server actions and route handlers
 * must not hard-delete, and must not read owned tables without scoped().
 * Raw db.delete( is banned everywhere outside this test. Raw db.select( /
 * tx.select( in actions/api must be accompanied by scoped( in the same file.
 */
function walk(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p) && !p.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

const root = join(__dirname, "..");

describe("data-access guard rails", () => {
  it("never issues a hard DELETE", () => {
    const offenders = walk(root).filter((f) => /\b(db|tx|c\.db)\.delete\(/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("every action/query/api file that selects from the db also uses scoped()", () => {
    const dirs = ["actions", "lib/queries", "app/api"].map((d) => join(root, d));
    const offenders: string[] = [];
    for (const dir of dirs) {
      let files: string[] = [];
      try {
        files = walk(dir);
      } catch {
        continue;
      }
      for (const f of files) {
        const src = readFileSync(f, "utf8");
        const selects = /\b(db|tx|c\.db)\s*\.\s*(select|query)\b/.test(src);
        if (selects && !/scoped\(/.test(src) && !/\/\/ unscoped-ok/.test(src)) offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });
});
