import { Button } from "./ui/button";

import { useNavigate } from "@tanstack/react-router";

import { createDataVersionServerFn } from "@/data/formDataVersions";
import { updateWorkflowStateServerFn } from "@/data/workflowInstances";
import {
	type FormSchema,
	createZodValidationSchema,
	makeInitialValues,
} from "@/types/form";
import type { AnyFieldApi } from "@tanstack/react-form";
import { toast } from "sonner";
import { createActor, createMachine } from "xstate";
import { Input } from "./ui/input";
import { useAppForm } from "./ui/tanstack-form";
import { Textarea } from "./ui/textarea";

interface DynamicFormProps {
	key: number;
	schema: FormSchema;
	initialData?: Record<string, string>;
	workflowInstanceId: number;
	formDefId: number;
	//improve this typing
	machineConfig: Record<string, unknown>;
}

export const DynamicForm = ({
	schema,
	initialData,
	workflowInstanceId,
	formDefId,
	machineConfig,
}: DynamicFormProps) => {
	const navigate = useNavigate();
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
	const workflowActor = createActor(workflowMachine).start();

	workflowActor.subscribe(async (snapshot) => {
		console.log("subscription state value: ", snapshot.value);

		await updateWorkflowStateServerFn({
			data: {
				id: Number(workflowInstanceId),
				newState: snapshot.value.toString(),
			},
		});
		// replace(`${pathname}`);
	});

	async function onSave(data: Record<string, string>) {
		try {
			//TODO: add RQ mutation
			await createDataVersionServerFn({
				data: {
					workflowInstanceId,
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
					{workflowActor.getSnapshot().can({ type: "NEXT" }) && (
						<Button
							type="button"
							onClick={() => workflowActor.send({ type: "NEXT" })}
						>
							Next
						</Button>
					)}
				</div>
			</form>
		</form.AppForm>
	);
};
