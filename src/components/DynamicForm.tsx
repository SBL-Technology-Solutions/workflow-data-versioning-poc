import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { __unsafe_getAllOwnEventDescriptors, createMachine } from "xstate";
import { createDataVersionServerFn } from "@/data/formDataVersions";
import {
	sendWorkflowEventServerFn,
	type WorkflowInstance,
} from "@/data/workflowInstances";
import {
	createZodValidationSchema,
	type FormSchema,
	makeInitialValues,
} from "@/types/form";
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
	//improve this typing
	machineConfig: Record<string, unknown>;
}

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
	// const pathname = usePathname();

	const validationSchema = createZodValidationSchema(schema);

	const effectiveInitialData = initialData ?? makeInitialValues(schema);

	const form = useAppForm({
		defaultValues: effectiveInitialData,
		onSubmit: async ({ value }) => {
			// Do something with form data
			console.log(value);
			await onSave(value);
		},
		validators: {
			onChange: validationSchema,
		},
	});

	const workflowMachine = createMachine(machineConfig);

	const resolvedState = workflowMachine.resolveState({
		value: workflowInstance.currentState,
	});
	console.log("resolvedState: ", resolvedState);
	// const workflowActor = createActor(workflowMachine, {
	// 	snapshot: resolvedState,
	// }).start();

	const nextEvents = __unsafe_getAllOwnEventDescriptors(resolvedState);
	console.log("nextEvents: ", nextEvents);
	console.log("form state: ", form.state);

	// const nextState = transition(workflowMachine, resolvedState, { type: "NEXT" });
	// console.log("nextState: ", nextState);

	// workflowActor.getSnapshot().nextEvents

	// workflowActor.subscribe(async (snapshot) => {
	// 	console.log("subscription state value: ", snapshot.value);

	// 	await updateWorkflowStateServerFn({
	// 		data: {
	// 			id: workflowInstance.id,
	// 			newState: snapshot.value.toString(),
	// 		},
	// 	});
	// 	// replace(`${pathname}`);
	// });

	async function onSave(data: Record<string, string>) {
		try {
			//TODO: add RQ mutation
			await createDataVersionServerFn({
				data: {
					workflowInstanceId: workflowInstance.id,
					formDefId,
					data,
				},
			});
			toast.success("Form definition saved successfully");
		} catch (error) {
			toast.error("Failed to save form definition");
		}
	}

	const renderField = (fieldMeta: FormSchema["fields"][number]) => (
		<form.AppField
			key={fieldMeta.name}
			name={fieldMeta.name}
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
					form.handleSubmit();
				}}
			>
				{schema.title ? (
					<h2 className="text-xl font-semibold">{schema.title}</h2>
				) : null}
				{schema.description ? (
					<p className="text-muted-foreground">{schema.description}</p>
				) : null}
				{schema.fields.map((field) => renderField(field))}
				<div className="flex space-x-2">
					<Button type="submit">Save</Button>
					<div className="flex space-x-2">
						{nextEvents.length === 0
							? null
							: nextEvents.map((evt) => (
									<Button
										type="button"
										key={evt}
										onClick={() => sendWorkflowEvent.mutate(evt)}
										disabled={
											//TODO: Form state isValid is not working as the form state is always valid
											sendWorkflowEvent.isPending || !form.state.isValid
										}
									>
										{evt}
									</Button>
								))}
					</div>
				</div>
			</form>
		</form.AppForm>
	);
};
