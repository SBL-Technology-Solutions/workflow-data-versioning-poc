import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { createDataVersionServerFn } from "@/data/formDataVersions";
import {
	sendWorkflowEventServerFn,
	type WorkflowInstance,
} from "@/data/workflowInstances";
import {
	createZodValidationSchema,
	type FormSchema,
	makeInitialValues,
} from "@/lib/form";
import { getNextEvents } from "@/lib/workflow";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAppForm } from "./ui/tanstack-form";
import { Textarea } from "./ui/textarea";

interface DynamicFormProps {
	key: number;
	schema: FormSchema;
	initialData?: Record<string, string>;
	workflowInstance: WorkflowInstance;
	formDefId: number;
	//TODO: improve this typing
	machineConfig: Record<string, unknown>;
}

const defaultSubmitMeta: { event: string | null } = {
	event: null,
};

export const DynamicForm = ({
	schema,
	initialData,
	workflowInstance,
	formDefId,
	machineConfig,
}: DynamicFormProps) => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const sendWorkflowEvent = useMutation({
		mutationFn: (event: string) =>
			sendWorkflowEventServerFn({
				data: {
					instanceId: workflowInstance.id,
					event,
					formDefId,
					formData: form.state.values,
				},
			}),
		onSuccess: (result) => {
			queryClient.invalidateQueries({
				queryKey: ["workflowInstance", workflowInstance.id],
			});
			toast.success("Event sent successfully");
			// update path to next state
			navigate({
				to: "/workflowInstances/$instanceId",
				params: {
					instanceId: workflowInstance.id.toString(),
				},
				search: {
					state: result.currentState,
				},
			});
		},
	});

	const saveFormData = useMutation({
		mutationFn: (data: Record<string, string>) =>
			createDataVersionServerFn({
				data: {
					workflowInstanceId: workflowInstance.id,
					formDefId,
					data,
				},
			}),
		onSuccess: () => {
			toast.success("Form definition saved successfully");
		},
		onError: () => {
			toast.error("Failed to save form definition");
		},
	});

	const validationSchema = useMemo(
		() => createZodValidationSchema(schema),
		[schema],
	);

	const effectiveInitialData = useMemo(
		() => initialData ?? makeInitialValues(schema),
		[initialData, schema],
	);

	const nextEvents = useMemo(
		() => getNextEvents(machineConfig, workflowInstance),
		[machineConfig, workflowInstance],
	);

	const form = useAppForm({
		defaultValues: effectiveInitialData,
		onSubmitMeta: defaultSubmitMeta,
		onSubmit: async ({ value, meta }) => {
			if (meta.event) {
				sendWorkflowEvent.mutate(meta.event);
			} else {
				saveFormData.mutate(value);
			}
		},
		validators: {
			onChange: validationSchema,
			onMount: validationSchema,
		},
	});

	const renderField = (fieldMeta: FormSchema["fields"][number]) => (
		<form.AppField
			key={fieldMeta.name}
			name={fieldMeta.name}
			// biome-ignore lint/correctness/noChildrenProp: this is how tanstack form works
			children={(field) => (
				<div className="space-y-2">
					<field.FormItem>
						<field.FormLabel>
							{fieldMeta.label}
							{fieldMeta.required ? (
								<span className="text-destructive -ml-1">*</span>
							) : null}
						</field.FormLabel>
					</field.FormItem>
					{fieldMeta.type === "textarea" ? (
						<field.FormControl>
							<Textarea
								id={field.name}
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								rows={fieldMeta.rows}
								placeholder={fieldMeta.description}
							/>
						</field.FormControl>
					) : (
						<field.FormControl>
							<Input
								id={field.name}
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								type={fieldMeta.type}
								placeholder={fieldMeta.description}
							/>
						</field.FormControl>
					)}
					<field.FormMessage />
				</div>
			)}
		/>
	);

	return (
		<form.AppForm>
			<form
				className="flex flex-col gap-6"
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
				}}
			>
				{schema.title ? (
					<h2 className="text-xl font-semibold">{schema.title}</h2>
				) : null}
				{schema.description ? (
					<p className="text-muted-foreground">{schema.description}</p>
				) : null}
				{schema.fields.map((field) => renderField(field))}
				<form.Subscribe selector={(state) => state.canSubmit}>
					{(canSubmit) => (
						<div className="flex space-x-2">
							<Button
								type="button"
								disabled={saveFormData.isPending}
								variant="outline"
								onClick={() => saveFormData.mutate(form.state.values)}
							>
								{saveFormData.isPending ? "Saving..." : "Save"}
							</Button>
							<div className="flex space-x-2">
								{nextEvents.length === 0
									? null
									: nextEvents.map((event) => (
											<Button
												type="submit"
												key={event}
												onClick={() =>
													form.handleSubmit({
														event,
													})
												}
												disabled={sendWorkflowEvent.isPending || !canSubmit}
											>
												{sendWorkflowEvent.isPending ? "Submitting..." : event}
											</Button>
										))}
							</div>
						</div>
					)}
				</form.Subscribe>
			</form>
		</form.AppForm>
	);
};
