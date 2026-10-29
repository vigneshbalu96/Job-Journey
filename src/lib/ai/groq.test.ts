import { describe, expect, it } from "vitest";
import { z } from "zod";
import { toStrictSchema, trimToSchema } from "./groq";
import { TASK_SCHEMAS } from "./tasks";

const STRICT_REJECTS = ["minItems", "maxItems", "minimum", "maximum", "exclusiveMinimum", "exclusiveMaximum", "minLength", "maxLength", "format", "pattern"];

describe("groq schema helpers", () => {
  it("strips every keyword strict mode refuses, for every task schema", () => {
    for (const schema of Object.values(TASK_SCHEMAS)) {
      const text = JSON.stringify(toStrictSchema(z.toJSONSchema(schema, { target: "draft-7" }) as never));
      for (const key of STRICT_REJECTS) expect(text).not.toContain(`"${key}"`);
    }
  });

  it("keeps the limits as description text", () => {
    const strict = toStrictSchema(z.toJSONSchema(z.object({ tags: z.array(z.string()).max(3).describe("Tags") })) as never);
    expect(strict.properties?.tags.description).toBe("Tags (at most 3 items)");
  });

  it("trims arrays to maxItems, including inside nullable and nested objects", () => {
    const schema = z.object({ a: z.array(z.string()).max(2), b: z.array(z.object({ c: z.array(z.number()).max(1) })).nullable() });
    const json = z.toJSONSchema(schema) as never;
    const trimmed = trimToSchema({ a: ["x", "y", "z"], b: [{ c: [1, 2] }] }, json);
    expect(schema.parse(trimmed)).toEqual({ a: ["x", "y"], b: [{ c: [1] }] });
  });
});
