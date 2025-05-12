import { Button } from "./ui/button";

import { useNavigate } from "@tanstack/react-router";

import { createDataVersionServerFn } from "@/data/formDataVersions";
import { updateWorkflowStateServerFn } from "@/data/workflowInstances";
import { type FormSchema, createZodValidationSchema } from "@/types/form";
import { type AnyFieldApi, useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { createActor, createMachine } from "xstate";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
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

function FieldInfo({
	field,
	fieldMeta,
}: { field: AnyFieldApi; fieldMeta: FormSchema["fields"][number] }) {
	return (
		<>
			{field.state.meta.isTouched && !field.state.meta.isValid ? (
				<em className="text-[0.8rem] font-medium text-destructive">
					{field.state.meta.errors.map(({ message }, index) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
						<p key={index} className="text-sm font-medium text-destructive">
							{message}
						</p>
					))}
				</em>
			) : (
				<em className="text-[0.8rem] font-medium text-muted-foreground">
					{fieldMeta.description}
				</em>
			)}
		</>
	);
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

	// Create initial data if not provided
	const defaultInitialData = Object.fromEntries(
		schema.fields.map((f) => [f.name, ""]),
	) as Record<string, string>;

	const effectiveInitialData = initialData ?? defaultInitialData;

	const form = useForm({
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
		<form.Field key={fieldMeta.name} name={fieldMeta.name}>
			{(field) => (
				<div className="space-y-2">
					<div className="space-y-1">
						<Label htmlFor={field.name}>
							{fieldMeta.label}
							{fieldMeta.required ? (
								<span className="text-destructive ml-1">*</span>
							) : null}
						</Label>
						{fieldMeta.type === "textarea" ? (
							<Textarea
								id={field.name}
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								rows={fieldMeta.rows}
								placeholder={fieldMeta.description}
							/>
						) : (
							<Input
								id={field.name}
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								type={fieldMeta.type}
								placeholder={fieldMeta.description}
							/>
						)}
					</div>
					<FieldInfo field={field} fieldMeta={fieldMeta} />
				</div>
			)}
		</form.Field>
	);

	return (
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
	);
};
