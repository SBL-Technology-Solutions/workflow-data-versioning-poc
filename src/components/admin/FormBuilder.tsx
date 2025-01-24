"use client";

import { createFormVersion } from "@/app/server/actions/WorkflowVersioningActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormFieldType, FormSchema, type FormField } from "@/lib/types/form";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

interface FormBuilderProps {
  initialSchema: FormSchema;
  workflowId: number;
  state: string;
}

const defaultField: FormField = {
  name: "",
  type: "text",
  label: "",
  required: false,
  description: "",
};

export function FormBuilder({
  initialSchema,
  workflowId,
  state,
}: FormBuilderProps) {
  const form = useForm<FormSchema>({
    defaultValues: initialSchema || {
      title: "",
      description: "",
      fields: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  // Use useEffect to reset form values when initialSchema changes
  useEffect(() => {
    form.reset(initialSchema);
  }, [initialSchema, form]);

  async function onSubmit(data: FormSchema) {
    try {
      await createFormVersion(workflowId, state, data);
      toast.success("Form definition saved successfully");
    } catch (error) {
      toast.error("Failed to save form definition");
      console.error("Failed to save form:", error);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Form Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="title">Form Title</Label>
            <Input {...form.register("title")} id="title" />
          </div>
          <div>
            <Label htmlFor="description">Form Description</Label>
            <Input {...form.register("description")} id="description" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <Card key={field.id}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Field {index + 1}</CardTitle>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => remove(index)}
                >
                  Remove
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Field Name</Label>
                  <Input
                    {...form.register(`fields.${index}.name`)}
                    placeholder="e.g., firstName"
                  />
                </div>
                <div>
                  <Label>Field Type</Label>
                  <Select
                    onValueChange={(value: FormFieldType) =>
                      form.setValue(`fields.${index}.type`, value)
                    }
                    defaultValue={field.type}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="textarea">Textarea</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Label</Label>
                <Input
                  {...form.register(`fields.${index}.label`)}
                  placeholder="e.g., First Name"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  {...form.register(`fields.${index}.description`)}
                  placeholder="Field description"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  {...form.register(`fields.${index}.required`)}
                  id={`required-${index}`}
                />
                <Label htmlFor={`required-${index}`}>Required</Label>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => append(defaultField)}
        >
          Add Field
        </Button>
        <Button type="submit">Save Form</Button>
      </div>
    </form>
  );
}
