import { describe, expect, it } from "vitest";
import { parseSubscriberLines } from "../src/lib/subscriber-import";

describe("subscriber import parser", () => {
  it("parses, normalizes, and deduplicates email/name rows", () => {
    expect(parseSubscriberLines("ADA@EXAMPLE.COM,Ada Lovelace\n bob@example.com \nada@example.com,Ada L.")).toEqual([
      { email: "ada@example.com", name: "Ada L." },
      { email: "bob@example.com" },
    ]);
  });
});
