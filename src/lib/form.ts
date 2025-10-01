import type { FormValidateOrFn } from "@tanstack/react-form";
import * as z from "zod";

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
	required: z.boolean(),
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

export type FormValues<T extends FormSchema> = {
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

/**
 * Generates a Zod validation schema for the given form definition, optionally making all fields optional for partial validation.
 *
 * @param form - The form schema definition
 * @param isPartial - If true, all fields are treated as optional for partial validation (default: false)
 * @returns A validation function compatible with @tanstack/react-form, based on the generated Zod schema
 */
export function createZodValidationSchema<T extends FormSchema>(
	form: T,
	isPartial = false,
): FormValidateOrFn<FormValues<T>> {
	const zodSchema = createZodSchema(form, isPartial);
	return zodSchema as unknown as FormValidateOrFn<FormValues<T>>;
}

/**
 * Generates a Zod object schema for the provided form definition.
 *
 * For each field in the form, creates a corresponding Zod schema with appropriate validations based on field type and configuration. Supports partial schemas where all fields are optional.
 *
 * @param form - The form schema definition
 * @param isPartial - If true, all fields are made optional and required/minLength validations are skipped
 * @returns A Zod object schema representing the form's validation rules
 */
export function createZodSchema<T extends FormSchema>(
	form: T,
	isPartial = false,
) {
	// 1) Turn each field into a [name, schema] tuple
	const entries = form.fields.map((field) => {
		let schema: z.ZodTypeAny;

		// build the right ZodTypeAny for this field
		switch (field.type) {
			case "text":
			case "textarea": {
				let s: z.ZodString = z.string();
				// Only apply required validation if not partial
				if (field.required && !isPartial)
					s = s.min(1, { error: `${field.label} is required` });
				if (field.minLength != null && !isPartial)
					s = s.min(field.minLength, {
						error: `${field.label} must be at least ${field.minLength} characters long`,
					});
				if (field.maxLength != null)
					s = s.max(field.maxLength, {
						error: `${field.label} must be at most ${field.maxLength} characters long`,
					});
				if (field.type === "text" && field.pattern) {
					s = s.regex(new RegExp(field.pattern), {
						error: `${field.label} has invalid format`,
					});
				}
				schema = field.required && !isPartial ? s : s.optional();
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
	const shape = Object.fromEntries(entries);

	// 3) Return the ZodObject
	return z.object(shape);
}

/**
 * Returns the default empty value for a given form field type.
 *
 * For "text" and "textarea" fields, returns an empty string. For unsupported field types, returns an empty string as a fallback.
 *
 * @param f - The form field schema to determine the empty value for
 * @returns The empty value corresponding to the field type
 */
function emptyValueForField(f: FormFieldSchema): string {
	switch (f.type) {
		case "text":
		case "textarea":
			return "";
		// case "number":
		// 	return 0;
		// case "checkbox":
		// 	return false;
		// case "multiselect":
		// 	return [];
		default:
			return ""; // or throw, if you want to be exhaustive
	}
}

/**
 * Generates an object mapping each field name in the form schema to its initial empty value.
 *
 * For text and textarea fields, the initial value is an empty string. Other field types default to an empty string as well.
 *
 * @returns An object with field names as keys and their corresponding initial values.
 */
export function makeInitialValues<T extends FormSchema>(
	form: T,
): Record<T["fields"][number]["name"], string> {
	const initialValues: Record<string, string> = {};

	for (const field of form.fields) {
		initialValues[field.name] = emptyValueForField(field);
	}

	return initialValues;
}

/**
 * Formats Zod validation errors into a human-readable string
 * @param failedSafeParseData - The result of a failed Zod safeParse operation
 * @returns A comma-separated string of formatted error messages
 * @example
 * ```typescript
 * const result = schema.safeParse(data);
 * if (!result.success) {
 *   const errorMessage = formatZodErrors(result);
 *   console.log(errorMessage);
 *   // "✖ Unrecognized key: "extraKey"
 *   // "✖ Invalid input: expected string, received number
 *   // → at username
 *   // "✖ Invalid input: expected number, received string
 *   // → at favoriteNumbers[1]"
 * }
 * ```
 */
export const formatZodErrors = (
	failedSafeParseData: z.ZodSafeParseError<object>,
) => {
	return z.prettifyError(failedSafeParseData.error);
};
/**
 * Converts a FormSchema to a Zod schema and validates data against it
 * @param formSchema - The form schema definition containing field types and validation rules
 * @param data - The data object to validate against the schema
 * @param isPartial - Whether to make the schema partial (all fields optional). Defaults to false
 * @returns A Zod safeParse result containing success status and either validated data or validation errors
 * @example
 * ```typescript
 * const formSchema: FormSchema = {
 *   fields: [
 *     { name: "name", type: "text", required: true },
 *     { name: "email", type: "text", required: true }
 *   ]
 * };
 *
 * const data = { name: "John", email: "john@example.com" };
 * const result = ConvertToZodSchemaAndValidate(formSchema, data);
 *
 * if (result.success) {
 *   console.log("Valid data:", result.data);
 * } else {
 *   console.log("Validation errors:", formatZodErrors(result));
 * }
 *
 * // For partial validation (e.g., form updates)
 * const partialData = { name: "John" };
 * const partialResult = ConvertToZodSchemaAndValidate(formSchema, partialData, true);
 * ```
 */
export const ConvertToZodSchemaAndValidate = (
	formSchema: FormSchema,
	data: Record<string, string>,
	isPartial = false,
) => {
	const zodSchema = createZodSchema(formSchema, isPartial);
	return zodSchema.safeParse(data);
};
