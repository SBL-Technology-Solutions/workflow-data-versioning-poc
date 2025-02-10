"use client";

import { createDataVersion } from "@/app/actions/WorkflowVersioningActions";
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
import { usePathname, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
interface DynamicFormProps {
  schema: FormSchema;
  initialData?: Record<string, any>;
  workflowInstanceId: number;
  formDefId: number;
}

export const DynamicForm = ({
  schema,
  initialData,
  workflowInstanceId,
  formDefId,
}: DynamicFormProps) => {
  const { replace } = useRouter();
  const pathname = usePathname();
  
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

  const effectiveInitialData =
    initialData ?? defaultInitialData;
  console.log("effectiveInitialData: ", effectiveInitialData);

  const form = useForm<z.output<typeof validationSchema>>({
    resolver: zodResolver(validationSchema),
    defaultValues: effectiveInitialData,
    mode: "onTouched",
  });

  console.log(form.formState);

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
                rows={field.rows}
                placeholder={field.description}
              />
            ) : (
              <Input
                {...formField}
                type={field.type}
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

  async function onSubmit(data: Record<string, any>) {
    try {
      await createDataVersion(workflowInstanceId, formDefId, data);
      replace(`${pathname}`);
      toast.success("Form definition saved successfully");
    } catch (error) {
      toast.error("Failed to save form definition");
      console.error("Failed to save form:", error);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
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

        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
};
