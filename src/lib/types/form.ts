import { z } from "zod";

// Basic field types we support
export const FormFieldType = z.enum(["text", "textarea"]);
export type FormFieldType = z.infer<typeof FormFieldType>;

// Base schema for all field types
const BaseFieldSchema = z.object({
  name: z.string(),
  type: FormFieldType,
  label: z.string(),
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
export type FormField = z.infer<typeof FormFieldSchema>;

// The complete form schema definition (metadata)
export const FormSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  fields: z.array(FormFieldSchema),
});
export type Form = z.infer<typeof FormSchema>;

// Helper to create the runtime validation schema for react-hook-form
export function createFormValidationSchema(form: Form) {
  const shape: Record<string, z.ZodType> = {};

  for (const field of form.fields) {
    let fieldSchema = z.string();

    // Add validations based on field type and constraints
    if (field.required) {
      fieldSchema = fieldSchema.min(1, {
        message: `${field.label} is required`,
      });
    }
    // else {
    //   fieldSchema = fieldSchema.nullable();
    // }

    if (field.minLength) {
      fieldSchema = fieldSchema.min(field.minLength, {
        message: `${field.label} must be at least ${field.minLength} characters`,
      });
    }

    if (field.maxLength) {
      fieldSchema = fieldSchema.max(field.maxLength, {
        message: `${field.label} must be at most ${field.maxLength} characters`,
      });
    }

    if (field.type === "text" && field.pattern) {
      fieldSchema = fieldSchema.regex(new RegExp(field.pattern), {
        message: `${field.label} has an invalid format`,
      });
    }

    shape[field.name] = fieldSchema;
  }

  return z.object(shape);
}
