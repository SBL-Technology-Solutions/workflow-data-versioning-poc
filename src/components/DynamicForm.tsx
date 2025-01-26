"use client";

import { FormState } from "@/app/server/actions/onSubmitAction";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createZodValidationSchema, type FormSchema } from "@/lib/types/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
interface DynamicFormProps {
  schema: FormSchema;
  initialData?: Record<string, any>;
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
}

export const DynamicForm = ({
  schema,
  initialData,
  action,
}: DynamicFormProps) => {
  const validationSchema = createZodValidationSchema(schema);

  // Create initial data if not provided
  const defaultInitialData = schema.fields.reduce<Record<string, string>>(
    (acc, field) => {
      acc[field.name] = "";
      return acc;
    },
    {}
  );
  console.log("initialData: ", initialData);
  console.log("defaultInitialData: ", defaultInitialData);

  const [formState, formAction, isPending] = useActionState<
    FormState,
    FormData
  >(action, {
    success: false,
  });

  const effectiveInitialData =
    initialData ?? formState?.fields ?? defaultInitialData;
  console.log("effectiveInitialData: ", effectiveInitialData);

  const form = useForm<z.output<typeof validationSchema>>({
    resolver: zodResolver(validationSchema),
    defaultValues: effectiveInitialData,
    mode: "onTouched",
  });

  console.log(form.formState);
  console.log("fields returned: ", { ...(formState?.fields ?? {}) });

  const formRef = useRef<HTMLFormElement>(null);

  const renderField = (name: string, field: FormSchema["fields"][number]) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field: formField }) => (
        <FormItem>
          <FormLabel>
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            {field.type === "textarea" ? (
              <Textarea
                {...formField}
                disabled={isPending}
                rows={field.rows}
                placeholder={field.description}
              />
            ) : (
              <Input
                {...formField}
                type={field.type}
                disabled={isPending}
                placeholder={field.description}
              />
            )}
          </FormControl>
          {field.description && (
            <FormDescription>{field.description}</FormDescription>
          )}
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      {formState.message !== "" && !formState?.errors && (
        <div className="text-destructive">
          <p>{formState.message}</p>
        </div>
      )}
      {formState?.errors && (
        <div>
          <ul>
            {Object.entries(formState.errors).map(([key, value]) => (
              <li key={key} className="flex gap-1 text-destructive">
                {key}: {value?.join(", ")}
              </li>
            ))}
          </ul>
        </div>
      )}
      <form
        ref={formRef}
        action={formAction}
        onSubmit={(evt) => {
          evt.preventDefault();
          form.handleSubmit(() => {
            console.log("formRef.current: ", formRef.current);
            startTransition(() => formAction(new FormData(formRef.current!)));
          })(evt);
        }}
        className="space-y-6"
      >
        {schema.title && (
          <h2 className="text-xl font-semibold">{schema.title}</h2>
        )}
        {schema.description && (
          <p className="text-muted-foreground">{schema.description}</p>
        )}

        {schema.fields.map((field) => (
          <div key={field.name}>{renderField(field.name, field)}</div>
        ))}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </Form>
  );
};
