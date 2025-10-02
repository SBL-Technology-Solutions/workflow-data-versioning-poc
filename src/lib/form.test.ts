import { describe, expect, it } from "vitest";
import {
	ConvertToZodSchemaAndValidate,
	createZodSchema,
	FormSchema,
	formatZodErrors,
	makeInitialValues,
} from "@/lib/form";

const simpleSchema: FormSchema = {
	title: "Test Form",
	fields: [
		{
			name: "name",
			type: "text",
			label: "Name",
			required: true,
			minLength: 2,
			maxLength: 5,
		},
	],
};

describe("lib/form", () => {
	it("FormSchema: validates metadata (title/fields/name)", () => {
		// empty fields
		const bad1 = FormSchema.safeParse({ title: "", fields: [] });
		expect(bad1.success).toBe(false);
		if (!bad1.success) {
			const msg = bad1.error.toString();
			expect(msg).toMatch(/Title is required/);
			expect(msg).toMatch(/At least one field is required/);
		}

		// name with spaces should fail, label required
		const bad2 = FormSchema.safeParse({
			title: "X",
			fields: [{ name: "has space", type: "text", label: "", required: true }],
		});
		expect(bad2.success).toBe(false);
		if (!bad2.success) {
			const msg = bad2.error.toString();
			expect(msg).toMatch(/Name cannot contain spaces/);
			expect(msg).toMatch(/Label is required/);
		}
	});
	it("makeInitialValues: returns empty strings for text/textarea", () => {
		const schema: FormSchema = {
			title: "Init",
			fields: [
				{ name: "a", type: "text", label: "A", required: false },
				{ name: "b", type: "textarea", label: "B", required: false },
			],
		};
		const values = makeInitialValues(schema);
		expect(values).toEqual({ a: "", b: "" });
	});

	it("createZodSchema: enforces required/min/max when not partial", () => {
		const z = createZodSchema(simpleSchema, false);
		// required
		const r1 = z.safeParse({ name: "" });
		expect(r1.success).toBe(false);
		if (!r1.success) expect(formatZodErrors(r1)).toMatch(/Name is required/);
		// min length
		const r2 = z.safeParse({ name: "a" });
		expect(r2.success).toBe(false);
		if (!r2.success)
			expect(formatZodErrors(r2)).toMatch(/at least 2 characters long/);
		// max length
		const r3 = z.safeParse({ name: "abcdef" });
		expect(r3.success).toBe(false);
		if (!r3.success)
			expect(formatZodErrors(r3)).toMatch(/at most 5 characters long/);
		// ok
		const ok = z.safeParse({ name: "abc" });
		expect(ok.success).toBe(true);
	});

	it("createZodSchema: optional field may be omitted, but validated if present", () => {
		const schema: FormSchema = {
			title: "Opt",
			fields: [
				{
					name: "opt",
					type: "text",
					label: "Opt",
					required: false,
					minLength: 2,
				},
			],
		};
		const z = createZodSchema(schema, false);
		// omitted is OK
		expect(z.safeParse({}).success).toBe(true);
		// present but too short should fail (min applies when provided)
		const res = z.safeParse({ opt: "a" });
		expect(res.success).toBe(false);
		if (!res.success)
			expect(formatZodErrors(res)).toMatch(/at least 2 characters long/);
	});

	it("createZodSchema: textarea enforces min/max like text", () => {
		const schema: FormSchema = {
			title: "TA",
			fields: [
				{
					name: "bio",
					type: "textarea",
					label: "Bio",
					required: true,
					minLength: 2,
					maxLength: 5,
				},
			],
		};
		const z = createZodSchema(schema);
		expect(z.safeParse({ bio: "" }).success).toBe(false);
		expect(z.safeParse({ bio: "a" }).success).toBe(false);
		expect(z.safeParse({ bio: "abcdef" }).success).toBe(false);
		expect(z.safeParse({ bio: "abcd" }).success).toBe(true);
	});

	it("createZodSchema: partial skips required/min but keeps max", () => {
		const z = createZodSchema(simpleSchema, true);
		// missing field allowed
		expect(z.safeParse({}).success).toBe(true);
		// min skipped in partial
		expect(z.safeParse({ name: "a" }).success).toBe(true);
		// max still enforced
		const tooLong = z.safeParse({ name: "abcdef" });
		expect(tooLong.success).toBe(false);
		if (!tooLong.success)
			expect(formatZodErrors(tooLong)).toMatch(/at most 5 characters long/);
	});

	it("ConvertToZodSchemaAndValidate: validates regex pattern and partial behavior", () => {
		const emailSchema: FormSchema = {
			title: "Email",
			fields: [
				{
					name: "email",
					type: "text",
					label: "Email",
					required: true,
					pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
				},
			],
		};
		// non-partial: bad email fails
		const bad = ConvertToZodSchemaAndValidate(emailSchema, { email: "nope" });
		expect(bad.success).toBe(false);
		if (!bad.success) expect(formatZodErrors(bad)).toMatch(/invalid format/);
		// partial: missing value allowed
		const partialOk = ConvertToZodSchemaAndValidate(emailSchema, {}, true);
		expect(partialOk.success).toBe(true);
		// partial: provided invalid value still fails
		const partialBad = ConvertToZodSchemaAndValidate(
			emailSchema,
			{ email: "nope" },
			true,
		);
		expect(partialBad.success).toBe(false);
		if (!partialBad.success)
			expect(formatZodErrors(partialBad)).toMatch(/invalid format/);
	});
});
