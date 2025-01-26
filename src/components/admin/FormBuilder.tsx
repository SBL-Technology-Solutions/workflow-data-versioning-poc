"use client";

import { FormState } from "@/app/server/actions/onSubmitAction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormSchema, type FormFieldSchema } from "@/lib/types/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useEffect, useRef } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

interface FormBuilderProps {
  initialSchema: FormSchema;
  workflowId: number;
  state: string;
  key: number;
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
}

const defaultField: FormFieldSchema = {
  name: "",
  type: "text",
  label: "",
  required: false,
  description: "",
};

export function FormBuilder({ initialSchema, action }: FormBuilderProps) {
  const form = useForm<FormSchema>({
    defaultValues: initialSchema || {
      title: "",
      description: "",
      fields: [],
    },
    resolver: zodResolver(FormSchema),
    mode: "onTouched",
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  const [formState, formAction, isPending] = useActionState<
    FormState,
    FormData
  >(action, {
    success: false,
  });

  console.log("formState", formState);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isPending || !formState) {
      return;
    }

    if (formState.success) {
      // Successfully submitted the form
      toast.success(formState.message);
    } else if (formState.errors) {
      // There was a server-side error
      toast.error(formState.message);
    }
  }, [formState, isPending]);

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
            const formData = new FormData(formRef.current!);
            // Add the fields array as a single entry
            formData.append("fields", JSON.stringify(form.getValues("fields")));
            console.log("formData in handleSubmit", formData);
            startTransition(() => formAction(formData));
          })(evt);
        }}
        className="space-y-6 mt-4"
      >
        <Card>
          <CardHeader>
            <CardTitle>Form Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Form Description</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                  <FormField
                    control={form.control}
                    name={`fields.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g., firstName" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`fields.${index}.type`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="textarea">Textarea</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name={`fields.${index}.label`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Label</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., First Name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`fields.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Field description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`fields.${index}.required`}
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          id={`required-${index}`}
                        />
                      </FormControl>
                      <FormLabel htmlFor={`required-${index}`}>
                        Required
                      </FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
          <Button type="submit" disabled={isPending}>
            {isPending ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
