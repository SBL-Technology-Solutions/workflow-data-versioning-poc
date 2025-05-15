import { createFormVersionServerFn } from "@/data/formDefinitions";
import {
	type FormSchema,
	FormSchema as ZodFormSchema,
	makeInitialValues,
} from "@/types/form";
import { useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { useAppForm } from "./ui/tanstack-form";

export const FormBuilder = ({
	initialSchema,
	workflowId,
	state,
}: { initialSchema: FormSchema; workflowId: number; state: string }) => {
	const form = useAppForm({
		defaultValues: initialSchema ?? makeInitialValues(initialSchema),
		validators: {
			onChange: ZodFormSchema,
		},
		onSubmit: async (data) => {
			try {
				await createFormVersionServerFn({
					data: { workflowDefId: workflowId, state, schema: data },
				});
				toast.success("Form definition saved successfully");
			} catch (error) {
				toast.error("Failed to save form definition");
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
			</form>
		</form.AppForm>
	);
};
