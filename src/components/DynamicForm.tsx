"use client";

import {
  type Form,
  type FormField,
  createFormValidationSchema,
} from "@/lib/types/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTransition } from "react";
import { useForm } from "react-hook-form";

interface DynamicFormProps {
  schema: Form;
  initialData?: Record<string, any>;
  //   onSubmit: (data: Record<string, any>) => Promise<void> | void;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  schema,
  initialData,
  //   onSubmit,
}) => {
  const [isPending, startTransition] = useTransition();

  const validationSchema = createFormValidationSchema(schema);

  const form = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: initialData,
  });

  const handleSubmitPromise = (data: Record<string, any>) => {
    startTransition(async () => {
      try {
        // await onSubmit(data);
        form.reset();
      } catch (error) {
        console.error("Form submission failed:", error);
      }
    });
  };

  const handleSubmit = (data: Record<string, any>) => {
    console.log("handleSubmit", data);
  };

  const renderField = (field: FormField) => {
    const commonProps = {
      ...form.register(field.name),
      disabled: isPending,
      required: field.required,
      "aria-describedby": field.description
        ? `${field.name}-description`
        : undefined,
    };

    switch (field.type) {
      case "text":
        return (
          <input
            type="text"
            className="border rounded p-2 w-full"
            minLength={field.minLength}
            maxLength={field.maxLength}
            pattern={field.pattern}
            {...commonProps}
          />
        );
      case "textarea":
        return (
          <textarea
            className="border rounded p-2 w-full"
            rows={field.rows}
            minLength={field.minLength}
            maxLength={field.maxLength}
            {...commonProps}
          />
        );
    }
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
      {schema.title && (
        <h2 className="text-xl font-semibold">{schema.title}</h2>
      )}
      {schema.description && (
        <p className="text-gray-600 mb-4">{schema.description}</p>
      )}

      {schema.fields.map((field) => (
        <div key={field.name} className="flex flex-col">
          <label className="text-sm font-medium mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {field.description && (
            <p
              id={`${field.name}-description`}
              className="text-sm text-gray-500 mb-1"
            >
              {field.description}
            </p>
          )}
          {renderField(field)}
          {form.formState.errors[field.name] && (
            <span className="text-red-500 text-sm mt-1">
              {form.formState.errors[field.name]?.message?.toString()}
            </span>
          )}
        </div>
      ))}
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50"
        disabled={isPending}
      >
        {isPending ? "Submitting..." : "Submit"}
      </button>
    </form>
  );
};
