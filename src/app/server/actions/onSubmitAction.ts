"use server";

import { createFormValidationSchema, type FormSchema } from "@/lib/types/form";

export type FormState = {
  success: boolean;
  message?: string;
  fields?: Record<string, string>;
  errors?: Partial<Record<string, string[]>>;
};

/**
 * Reusable server action wrapper for form submissions.
 *
 * @param prevState - The previous form state.
 * @param formData - The raw FormData from the client.
 * @param schema - The form validation schema.
 * @param action - The action to execute with the parsed form data and additional parameters.
 * @param actionParams - Additional parameters to pass to the action.
 * @returns FormState indicating success or failure, with validation errors if applicable.
 */
export const onSubmitAction = async (
  prevState: FormState,
  formData: FormData,
  schema: FormSchema,
  action: (data: Record<string, any>, ...args: any[]) => Promise<any>,
  ...actionParams: any[] // Additional parameters for the action
): Promise<FormState> => {
  try {
    // Ensure formData is a valid FormData instance
    if (!(formData instanceof FormData)) {
      return {
        success: false,
        errors: { error: ["Invalid Form Data"] },
      };
    }

    // Transform formData into a plain object
    const data = Object.fromEntries(formData.entries());

    // Generate the validation schema and validate the data
    const validationSchema = createFormValidationSchema(schema);
    const parsed = validationSchema.safeParse(data);

    if (!parsed.success) {
      // Handle validation errors
      const errors = parsed.error.flatten().fieldErrors;
      const fields: Record<string, string> = {};

      for (const key of Object.keys(data)) {
        fields[key] = data[key]?.toString() || "";
      }

      return {
        success: false,
        fields,
        errors,
      };
    }

    // Execute the provided action with the parsed data and additional parameters
    await action(parsed.data, ...actionParams);

    return {
      success: true,
      message: "Form submitted successfully",
      fields: parsed.data,
    };
  } catch (error: any) {
    console.error("Error in onSubmitAction:", error);
    return {
      success: false,
      message: error.message || "Failed to submit form",
    };
  }
};
