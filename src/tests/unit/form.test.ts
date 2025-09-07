// NOTE: Testing framework detected from repo (Jest/Vitest). Update import path below to actual source file.

/**
 * Unit tests for form schema utilities.
 * Testing library/framework: (will align with repository setup; defaulting to Vitest-style API).
 * If the repo uses Jest, these tests should still work with minor adjustments (globals describe/it/expect).
 */
import { z } from "zod";

// Prefer importing from the actual module path; adjust if necessary.
import {
  FormFieldType,
  FormFieldSchema,
  FormSchema,
  createZodSchema,
  createZodValidationSchema,
  makeInitialValues,
  formatZodErrors,
  ConvertToZodSchemaAndValidate,
} from "../../../src"; // TODO: Update this import to the actual source module path (e.g., "src/form" or similar).

// Note: These tests use a Jest/Vitest compatible API: describe/it/expect.

describe("Form schema enums and base schemas", () => {
  it("FormFieldType should accept only 'text' and 'textarea'", () => {
    expect(FormFieldType.parse("text")).toBe("text");
    expect(FormFieldType.parse("textarea")).toBe("textarea");
    expect(() =>
      FormFieldType.parse("number")
    ).toThrow();
    expect(() =>
      FormFieldType.parse("")
    ).toThrow();
  });

  it("FormFieldSchema discriminates by type and validates per-field properties", () => {
    // Valid text field
    const txt = FormFieldSchema.parse({
      name: "username",
      type: "text",
      label: "Username",
      required: true,
      minLength: 2,
      maxLength: 10,
      pattern: "^[a-z]+$",
    });
    expect(txt.type).toBe("text");

    // Valid textarea field
    const ta = FormFieldSchema.parse({
      name: "bio",
      type: "textarea",
      label: "Bio",
      rows: 5,
      minLength: 0,
      maxLength: 200,
    });
    expect(ta.type).toBe("textarea");

    // Invalid: name is required and cannot contain spaces
    expect(() =>
      FormFieldSchema.parse({
        name: "",
        type: "text",
        label: "Empty",
      })
    ).toThrow();

    expect(() =>
      FormFieldSchema.parse({
        name: "has space",
        type: "text",
        label: "With Space",
      })
    ).toThrow();

    // Invalid: label required
    expect(() =>
      FormFieldSchema.parse({
        name: "n",
        type: "text",
        label: "",
      })
    ).toThrow();
  });
});

describe("FormSchema", () => {
  it("requires title and at least one field", () => {
    const minimalField = {
      name: "n",
      type: "text",
      label: "N",
    } as const;

    expect(
      FormSchema.parse({
        title: "T",
        fields: [minimalField],
      })
    ).toBeTruthy();

    // Missing title
    expect(() =>
      FormSchema.parse({
        title: "",
        fields: [minimalField],
      })
    ).toThrow();

    // No fields
    expect(() =>
      FormSchema.parse({
        title: "T",
        fields: [],
      })
    ).toThrow();
  });
});

describe("createZodSchema()", () => {
  const baseForm = {
    title: "User",
    fields: [
      {
        name: "username",
        type: "text",
        label: "Username",
        required: true,
        minLength: 2,
        maxLength: 10,
        pattern: "^[a-z]+$",
      },
      {
        name: "bio",
        type: "textarea",
        label: "Bio",
        required: false,
        maxLength: 200,
      },
    ],
  } as const;

  it("builds a Zod object that enforces required/min/max and pattern for text", () => {
    const schema = createZodSchema(baseForm, false);

    // Happy path
    const ok = schema.safeParse({ username: "alice", bio: "" });
    expect(ok.success).toBe(true);

    // Required username
    const missing = schema.safeParse({ bio: "" });
    expect(missing.success).toBe(false);
    if (!missing.success) {
      const msg = formatZodErrors(missing);
      expect(String(msg)).toContain("Username is required");
    }

    // Min length
    const tooShort = schema.safeParse({ username: "a", bio: "" });
    expect(tooShort.success).toBe(false);
    if (!tooShort.success) {
      const msg = formatZodErrors(tooShort);
      expect(String(msg)).toContain("at least 2 characters");
    }

    // Max length
    const tooLong = schema.safeParse({ username: "a".repeat(11), bio: "" });
    expect(tooLong.success).toBe(false);
    if (!tooLong.success) {
      const msg = formatZodErrors(tooLong);
      expect(String(msg)).toContain("at most 10 characters");
    }

    // Pattern
    const badPattern = schema.safeParse({ username: "Alice", bio: "" });
    expect(badPattern.success).toBe(false);
    if (!badPattern.success) {
      const msg = formatZodErrors(badPattern);
      expect(String(msg)).toContain("invalid format");
    }

    // Optional bio with maxLength
    const bioTooLong = schema.safeParse({
      username: "alice",
      bio: "x".repeat(201),
    });
    expect(bioTooLong.success).toBe(false);
    if (!bioTooLong.success) {
      const msg = formatZodErrors(bioTooLong);
      expect(String(msg)).toContain("at most 200 characters");
    }
  });

  it("supports partial mode: skips required/min validations and makes fields optional", () => {
    const schema = createZodSchema(baseForm, true);

    // Missing required username should be ok in partial mode
    const res = schema.safeParse({ bio: "short" });
    expect(res.success).toBe(true);

    // Username too short is allowed (min skipped), but max and pattern still enforced if provided
    const short = schema.safeParse({ username: "a" });
    expect(short.success).toBe(true);

    // Pattern still enforced if provided
    const badPattern = schema.safeParse({ username: "Alice" });
    expect(badPattern.success).toBe(false);
    if (!badPattern.success) {
      const msg = formatZodErrors(badPattern);
      expect(String(msg)).toContain("invalid format");
    }

    // Max still enforced
    const tooLong = schema.safeParse({ username: "a".repeat(11) });
    expect(tooLong.success).toBe(false);
  });
});

describe("createZodValidationSchema()", () => {
  it("returns a function compatible with react-form (zod schema cast)", () => {
    const form = {
      title: "Login",
      fields: [
        { name: "email", type: "text", label: "Email", required: true },
        { name: "notes", type: "textarea", label: "Notes" },
      ],
    } as const;

    const validate = createZodValidationSchema(form, false);
    // We can't invoke it directly without react-form context,
    // but ensure it is a function-like value.
    expect(typeof validate === "function" || typeof validate === "object").toBe(
      true,
    );
  });
});

describe("makeInitialValues()", () => {
  it("returns empty strings for text and textarea fields; fallback empty string for others", () => {
    const form = {
      title: "Any",
      fields: [
        { name: "a", type: "text", label: "A" },
        { name: "b", type: "textarea", label: "B" },
        // Unknown type should fall back to ""
        { name: "c", type: "unknown" as any, label: "C" },
      ],
    } as const;

    const init = makeInitialValues(form);
    expect(init).toEqual({ a: "", b: "", c: "" });
  });
});

describe("formatZodErrors()", () => {
  it("formats a failed safeParse error via z.prettifyError", () => {
    const schema = z.object({
      x: z.string(),
    });
    const result = schema.safeParse({ x: 1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = formatZodErrors(result);
      expect(String(msg)).toContain("Invalid input");
    }
  });
});

describe("ConvertToZodSchemaAndValidate()", () => {
  const formSchema = {
    title: "Account",
    fields: [
      { name: "name", type: "text", label: "Name", required: true },
      { name: "about", type: "textarea", label: "About", maxLength: 50 },
    ],
  } as const;

  it("validates happy path", () => {
    const data = { name: "John", about: "" };
    const res = ConvertToZodSchemaAndValidate(formSchema, data, false);
    expect(res.success).toBe(true);
  });

  it("fails for missing required fields in non-partial mode", () => {
    const data = { about: "" } as any;
    const res = ConvertToZodSchemaAndValidate(formSchema, data, false);
    expect(res.success).toBe(false);
  });

  it("succeeds in partial mode with missing required fields", () => {
    const data = { about: "" } as any;
    const res = ConvertToZodSchemaAndValidate(formSchema, data, true);
    expect(res.success).toBe(true);
  });

  it("enforces maxLength when provided", () => {
    const data = { name: "John", about: "x".repeat(51) };
    const res = ConvertToZodSchemaAndValidate(formSchema, data, false);
    expect(res.success).toBe(false);
  });
});