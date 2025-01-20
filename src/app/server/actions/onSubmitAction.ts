"use server";

import { createFormValidationSchema, type FormSchema } from "@/lib/types/form";

export type FormState = {
  success: boolean;
  message?: string;
  fields?: Record<string, string>;
  errors?: Partial<Record<string, string[]>>;
};

export const onSubmitAction = async (
  prevState: FormState,
  formData: FormData,
  schema: FormSchema,
  //need to figure out a way to pass in the action even when the action has multiple other arguments
  action: (data: Record<string, any>) => Promise<void>
): Promise<FormState> => {
  console.log("formData: ", formData);
  if (!(formData instanceof FormData)) {
    return {
      success: false,
      errors: { error: ["Invalid Form Data"] },
    };
  }

  const data = Object.fromEntries(formData);
  console.log("data: ", data);
  const validationSchema = createFormValidationSchema(schema);
  const parsed = validationSchema.safeParse(data);
  console.log("parsed: ", parsed);
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const fields: Record<string, string> = {};

    for (const key of Object.keys(data)) {
      fields[key] = data[key].toString();
    }

    return {
      success: false,
      fields,
      errors,
    };
  }

  if (action) {
    try {
      const result = await action(parsed.data);
      console.log("action success: ", result);
      return {
        success: true,
        message: "Form submitted successfully",
        fields: parsed.data,
      };
    } catch (error) {
      console.error(error);
      return {
        success: false,
        message: "Failed to submit form",
        fields: parsed.data,
      };
    }
  }

  return {
    success: true,
    message: "Form submitted successfully",
    fields: parsed.data,
  };
};
