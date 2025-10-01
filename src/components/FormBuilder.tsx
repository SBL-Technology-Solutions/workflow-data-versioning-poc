// biome-ignore-all lint/correctness/noChildrenProp: this is how tanstack form works
import { useCallback } from "react";
import { toast } from "sonner";
import { API } from "@/data/API";
import {
	type FormFieldSchema,
	type FormSchema,
	makeInitialValues,
	FormSchema as ZodFormSchema,
} from "@/lib/form";
import { clientLoggerFn } from "@/lib/logger";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { useAppForm } from "./ui/tanstack-form";

const defaultField: FormFieldSchema = {
	name: "",
	type: "text",
	label: "",
	required: false,
	description: "",
};

export const FormBuilder = ({
	initialSchema,
	workflowId,
	state,
}: {
	initialSchema: FormSchema;
	workflowId: number;
	state: string;
}) => {
	const form = useAppForm({
		defaultValues: initialSchema ?? makeInitialValues(initialSchema),
		validators: {
			onChange: ZodFormSchema,
		},
		onSubmit: async (data) => {
			clientLoggerFn({
				data: {
					level: "info",
					message: "Submitting form builder schema",
					meta: {
						workflowId,
						state,
						fieldCount: data.value.fields.length,
					},
				},
			});
			try {
				await API.formDefinition.mutations.createFormVersionServerFn({
					data: { workflowDefId: workflowId, state, schema: data.value },
				});
				toast.success("Form definition saved successfully");
				clientLoggerFn({
					data: {
						level: "info",
						message: "Form definition saved",
						meta: {
							workflowId,
							state,
							fieldCount: data.value.fields.length,
						},
					},
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				toast.error("Failed to save form definition", {
					description: message,
				});
				clientLoggerFn({
					data: {
						level: "error",
						message: "Failed to save form definition",
						meta: {
							workflowId,
							state,
							error: message,
						},
					},
				});
			}
		},
	});

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			e.stopPropagation();
			form.handleSubmit();
		},
		[form],
	);

	return (
		<form.AppForm>
			<form className="space-y-6" onSubmit={handleSubmit}>
				<Card>
					<CardHeader>
						<CardTitle>Form Details</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<form.AppField
							name="title"
							children={(field) => (
								<field.FormItem>
									<field.FormLabel>Form Title</field.FormLabel>
									<field.FormControl>
										<Input
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
									</field.FormControl>

									<field.FormMessage />
								</field.FormItem>
							)}
						/>
						<form.AppField
							name="description"
							children={(field) => (
								<field.FormItem>
									<field.FormLabel>Form Description</field.FormLabel>
									<field.FormControl>
										<Input
											value={field.state.value}
											onChange={(e) => field.handleChange(e.target.value)}
											onBlur={field.handleBlur}
										/>
									</field.FormControl>

									<field.FormMessage />
								</field.FormItem>
							)}
						/>
					</CardContent>
				</Card>

				<form.AppField
					name="fields"
					mode="array"
					children={(field) => (
						<div className="space-y-4">
							{field.state.value.map((_, i) => {
								return +(
									<Card key={`${i}-${field.state.value[i].name}`}>
										<CardHeader>
											<div className="flex justify-between items-center">
												<CardTitle>Field {i + 1}</CardTitle>
												<Button
													type="button"
													variant="destructive"
													onClick={() => field.removeValue(i)}
												>
													Remove
												</Button>
											</div>
										</CardHeader>
										<CardContent className="space-y-4">
											<div className="grid grid-cols-2 gap-4">
												<form.AppField
													name={`fields[${i}].name`}
													children={(subField) => (
														<subField.FormItem>
															<subField.FormLabel>
																Field Name
															</subField.FormLabel>
															<subField.FormControl>
																<Input
																	value={subField.state.value}
																	onChange={(e) =>
																		subField.handleChange(e.target.value)
																	}
																	onBlur={subField.handleBlur}
																	placeholder="e.g., firstName"
																/>
															</subField.FormControl>
															<subField.FormMessage />
														</subField.FormItem>
													)}
												/>
												<form.AppField
													name={`fields[${i}].type`}
													children={(subField) => (
														<subField.FormItem>
															<subField.FormLabel>
																Field Type
															</subField.FormLabel>
															<Select
																onValueChange={(value) =>
																	subField.handleChange(
																		value as FormFieldSchema["type"],
																	)
																}
																defaultValue={subField.state.value}
															>
																<subField.FormControl>
																	<SelectTrigger className="w-full">
																		<SelectValue />
																	</SelectTrigger>
																</subField.FormControl>
																<SelectContent>
																	<SelectItem value="text">Text</SelectItem>
																	<SelectItem value="textarea">
																		Textarea
																	</SelectItem>
																</SelectContent>
															</Select>
														</subField.FormItem>
													)}
												/>
											</div>
											<form.AppField
												name={`fields[${i}].label`}
												children={(subField) => (
													<subField.FormItem>
														<subField.FormLabel>Label</subField.FormLabel>
														<subField.FormControl>
															<Input
																value={subField.state.value}
																onChange={(e) =>
																	subField.handleChange(e.target.value)
																}
																onBlur={subField.handleBlur}
																placeholder="e.g., First Name"
															/>
														</subField.FormControl>
														<subField.FormMessage />
													</subField.FormItem>
												)}
											/>
											<form.AppField
												name={`fields[${i}].description`}
												children={(subField) => (
													<subField.FormItem>
														<subField.FormLabel>Description</subField.FormLabel>
														<subField.FormControl>
															<Input
																value={subField.state.value}
																onChange={(e) =>
																	subField.handleChange(e.target.value)
																}
																onBlur={subField.handleBlur}
																placeholder="Field description"
															/>
														</subField.FormControl>
														<subField.FormMessage />
													</subField.FormItem>
												)}
											/>
											<form.AppField
												name={`fields[${i}].required`}
												children={(subField) => (
													<subField.FormItem>
														<subField.FormLabel>Required</subField.FormLabel>
														<subField.FormControl>
															<Checkbox
																checked={subField.state.value}
																onCheckedChange={(checked) =>
																	subField.handleChange(checked === true)
																}
																onBlur={subField.handleBlur}
															/>
														</subField.FormControl>
														<subField.FormMessage />
													</subField.FormItem>
												)}
											/>
										</CardContent>
									</Card>
								);
							})}
							<Button
								type="button"
								variant="outline"
								className="inline-flex"
								onClick={() => field.pushValue(defaultField)}
							>
								Add Field
							</Button>
						</div>
					)}
				/>
				<div className="flex gap-4">
					<Button type="submit">Save Form</Button>
				</div>
			</form>
		</form.AppForm>
	);
};
