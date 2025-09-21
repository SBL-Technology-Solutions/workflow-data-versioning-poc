import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { API } from "@/data/API";
import {
	createZodValidationSchema,
	type FormSchema,
	makeInitialValues,
} from "@/lib/form";
import { getNextEvents } from "@/lib/workflow";
import type { SerializableWorkflowMachineConfig } from "@/types/workflow";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAppForm } from "./ui/tanstack-form";
import { Textarea } from "./ui/textarea";

interface DynamicFormProps {
	schema: FormSchema;
	initialData?: Record<string, string>;
	workflowInstanceId: number;
	state: string;
	formDefId: number;
	machineConfig: SerializableWorkflowMachineConfig;
}

const defaultSubmitMeta: { event: string | null } = {
	event: null,
};

export const DynamicForm = ({
	schema,
	initialData,
	workflowInstanceId,
	state,
	formDefId,
	machineConfig,
}: DynamicFormProps) => {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const sendWorkflowEvent = useMutation({
		mutationFn: ({
			event,
			formData,
		}: {
			event: string;
			formData: Record<string, string>;
		}) =>
			API.workflowInstance.mutations.sendWorkflowEventServerFn({
				data: {
					instanceId: workflowInstanceId,
					event,
					formDefId,
					formData,
				},
			}),
		onSuccess: (result) => {
			toast.success("Event sent successfully");
			queryClient.invalidateQueries({
				queryKey: API.formDataVersion.queryKeys.detail(workflowInstanceId, {
					state: result.currentState,
				}),
			});
			queryClient.invalidateQueries({
				queryKey: API.workflowInstance.queryKeys.lists(),
			});
			navigate({
				to: "/workflowInstances/$instanceId",
				params: {
					instanceId: workflowInstanceId.toString(),
				},
				search: {
					state: result.currentState,
				},
			});
		},
	});

	const saveFormData = useMutation({
		mutationFn: (data: Record<string, string>) =>
			API.formDataVersion.mutations.saveFormDataServerFn({
				data: {
					workflowInstanceId: workflowInstanceId,
					formDefId,
					data,
				},
			}),
		onSuccess: () => {
			toast.success("Form saved successfully");
			queryClient.invalidateQueries({
				queryKey: API.formDataVersion.queryKeys.detail(workflowInstanceId, {
					state,
				}),
			});
		},
		//TODO: improve rendering of zod errors in toast as its losing the formatting by the time it gets here
		onError: (error) => {
			toast.error("Failed to save the form", {
				description: error.message,
			});
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
		() => getNextEvents(machineConfig, state),
		[machineConfig, state],
	);

	const form = useAppForm({
		defaultValues: effectiveInitialData,
		onSubmitMeta: defaultSubmitMeta,
		onSubmit: async ({ value, meta }) => {
			if (meta.event) {
				sendWorkflowEvent.mutate({ event: meta.event, formData: value });
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
								onBlur={() => { 
									field.handleBlur(); 
									saveFormData.mutate(form.state.values); }}
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
								onBlur={() => { 
									field.handleBlur(); 
									saveFormData.mutate(form.state.values); 
								}}
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
