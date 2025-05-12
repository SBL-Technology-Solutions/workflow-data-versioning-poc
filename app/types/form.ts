import type { FormValidateOrFn } from "@tanstack/react-form";
import { z } from "zod";

// Basic field types we support
export const FormFieldType = z.enum(["text", "textarea"]);
export type FormFieldType = z.infer<typeof FormFieldType>;

// Base schema for all field types
const BaseFieldSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.regex(/^\S*$/, "Name cannot contain spaces"),
	type: FormFieldType,
	label: z.string().min(1, "Label is required"),
	required: z.boolean().default(false),
	description: z.string().optional(),
});

// Text input specific schema
const TextFieldSchema = BaseFieldSchema.extend({
	type: z.literal("text"),
	minLength: z.number().optional(),
	maxLength: z.number().optional(),
	pattern: z.string().optional(),
});

// Textarea specific schema
const TextareaFieldSchema = BaseFieldSchema.extend({
	type: z.literal("textarea"),
	rows: z.number().optional().default(3),
	minLength: z.number().optional(),
	maxLength: z.number().optional(),
});

// Union of all field types
export const FormFieldSchema = z.discriminatedUnion("type", [
	TextFieldSchema,
	TextareaFieldSchema,
]);
export type FormFieldSchema = z.infer<typeof FormFieldSchema>;

// The complete form schema definition (metadata)
export const FormSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string().optional(),
	fields: z.array(FormFieldSchema).min(1, "At least one field is required"),
});
export type FormSchema = z.infer<typeof FormSchema>;

// 1) Same mapped types as before:
type FieldToZod<F extends FormFieldSchema> = F["type"] extends
	| "text"
	| "textarea"
	? z.ZodString
	: F["type"] extends "number"
		? z.ZodNumber
		: F["type"] extends "checkbox"
			? z.ZodBoolean
			: F["type"] extends "multiselect"
				? z.ZodArray<z.ZodString>
				: z.ZodTypeAny;

type FormValues<T extends FormSchema> = {
	[F in T["fields"][number] as F["name"]]: F["type"] extends "text" | "textarea"
		? string
		: F["type"] extends "number"
			? number
			: F["type"] extends "checkbox"
				? boolean
				: F["type"] extends "multiselect"
					? string[]
					: unknown;
};

// 2) Define a helper type for the shape of your Zod object:
type ZodShape<T extends FormSchema> = {
	[F in T["fields"][number] as F["name"]]: FieldToZod<F>;
};

export function createZodValidationSchema<T extends FormSchema>(
	form: T,
): FormValidateOrFn<FormValues<T>> {
	// 1) Turn each field into a [name, schema] tuple
	const entries = form.fields.map((field) => {
		let schema: z.ZodTypeAny;

		// build the right ZodTypeAny for this field
		switch (field.type) {
			case "text":
			case "textarea": {
				let s: z.ZodString = z.string();
				if (field.required)
					s = s.min(1, { message: `${field.label} is required` });
				if (field.minLength != null)
					s = s.min(field.minLength, {
						message: `${field.label} must be at least ${field.minLength}`,
					});
				if (field.maxLength != null)
					s = s.max(field.maxLength, {
						message: `${field.label} must be at most ${field.maxLength}`,
					});
				if (field.type === "text" && field.pattern) {
					s = s.regex(new RegExp(field.pattern), {
						message: `${field.label} has invalid format`,
					});
				}
				schema = field.required ? s : s.optional();
				break;
			}
			// case "number": {
			// 	let n: z.ZodNumber = z.number();
			// 	// you could `.min()`/.max() here as well
			// 	schema = field.required ? n : n.optional();
			// 	break;
			// }
			// case "checkbox": {
			// 	let b: z.ZodBoolean = z.boolean();
			// 	schema = field.required ? b : b.optional();
			// 	break;
			// }
			// case "multiselect": {
			// 	let a: z.ZodArray<z.ZodString> = z.array(z.string());
			// 	schema = field.required ? a : a.optional();
			// 	break;
			// }
			default:
				schema = z.any();
		}

		// return a constant tuple
		return [field.name, schema] as const;
	});

	// 2) Build your shape object in one shot
	const shape = Object.fromEntries(entries) as ZodShape<T>;

	// 3) Cast it into a ZodObject with the precise FormValues<T> input type
	return z.object(shape) as unknown as FormValidateOrFn<FormValues<T>>;
}
