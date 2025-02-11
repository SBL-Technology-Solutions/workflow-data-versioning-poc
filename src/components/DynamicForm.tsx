"use client";

import { createDataVersion, updateWorkflowState } from "@/app/actions/WorkflowVersioningActions";
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
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { createActor, createMachine } from "xstate";
import { usePathname, useRouter } from "next/navigation";

interface DynamicFormProps {
  key: number;
  schema: FormSchema;
  initialData?: Record<string, any>;
  workflowInstanceId: number;
  formDefId: number;
  machineConfig: Object;
}

export const DynamicForm = ({
  schema,
  initialData,
  workflowInstanceId,
  formDefId,
  machineConfig,
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

  const effectiveInitialData =
    initialData ?? defaultInitialData;

  const form = useForm<z.output<typeof validationSchema>>({
    resolver: zodResolver(validationSchema),
    defaultValues: effectiveInitialData,
    mode: "onTouched",
  });

  const workflowMachine = createMachine(machineConfig);
  const workflowActor = createActor(workflowMachine).start();

  workflowActor.subscribe(async (snapshot) => {
      console.log("subscription state value: ", snapshot.value);
      await updateWorkflowState(workflowInstanceId, snapshot.value.toString());
      replace(`${pathname}`);
  });

  async function onSave(data: Record<string, any>) {
    try {
      await createDataVersion(workflowInstanceId, formDefId, data);
      toast.success("Form definition saved successfully");
    } catch (error) {
      toast.error("Failed to save form definition");
    }
  }

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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSave)}
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
        <div className="flex space-x-2">
          <Button type="submit">Save</Button>
          {workflowActor.getSnapshot().can({type: 'NEXT'}) && (
            <Button type="button" onClick={() => workflowActor.send({ type: "NEXT" })}>Next</Button>
          )}
        </div>
      </form>
    </Form>
  );
};
