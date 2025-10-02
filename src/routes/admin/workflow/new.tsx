// biome-ignore-all lint/correctness/noChildrenProp: this is how tanstack form works

import { useStore } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useAppForm } from "@/components/ui/tanstack-form";
import { workflowDefinitionsInsertSchema } from "@/db/schema";
import { SerializableStateNode } from "@/types/workflow";

const defaultStateNode: SerializableStateNode & { name: string } = {
	name: "",
	// initial: "",
	// on: {},
};

export const Route = createFileRoute("/admin/workflow/new")({
	component: RouteComponent,
});

function RouteComponent() {
	const form = useAppForm({
		defaultValues: {
			name: "",
			states: [defaultStateNode],
			// machineConfig: {
			// 	initial: "",
			// 	states: {},
			// },
		},
		// validators: {
		// 	onChange: workflowDefinitionsInsertSchema,
		// },
		onSubmit: async (data) => {
			console.log(data);
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
			<form className="space-y-4" onSubmit={handleSubmit}>
				<form.AppField
					name="name"
					children={(field) => (
						<field.FormItem>
							<field.FormLabel>Name</field.FormLabel>
							<field.FormControl>
								<Input
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
								/>
							</field.FormControl>
						</field.FormItem>
					)}
				/>
				<form.AppField
					name="states"
					mode="array"
					children={(field) => (
						<div className="space-y-4">
							{field.state.value.map((_, i) => {
								return (
									<Card key={`${i}-${field.state.value[i].name}`}>
										<CardHeader>
											<div className="flex justify-between items-center">
												<CardTitle>Workflow Step {i + 1}</CardTitle>
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
											<form.AppField
												name={`states[${i}].name`}
												children={(subField) => (
													<subField.FormItem>
														<subField.FormLabel>
															Workflow Step Name
														</subField.FormLabel>
														<subField.FormControl>
															<Input
																value={subField.state.value}
																onChange={(e) =>
																	subField.handleChange(e.target.value)
																}
															/>
														</subField.FormControl>
													</subField.FormItem>
												)}
											/>
											<form.Subscribe
												selector={(state) => state.values.states}
												children={(states) => {
													const firstState = states[0]?.name;
													if (!firstState) {
														return null;
													}
													return (
														<form.AppField
															name={`states[${i}].on`}
															children={(subField) => (
																<subField.FormItem>
																	<subField.FormLabel>
																		Workflow Step Transition
																	</subField.FormLabel>
																	<Select
																		onValueChange={(value) =>
																			subField.handleChange(value)
																		}
																		defaultValue={subField.state.value}
																	>
																		<subField.FormControl>
																			<SelectTrigger>
																				<SelectValue placeholder="Select a state to transition to" />
																			</SelectTrigger>
																		</subField.FormControl>
																		<SelectContent>
																			{states
																				.filter(
																					(state) =>
																						state.name &&
																						state.name.trim() !== "",
																				)
																				.map((state) => (
																					<SelectItem
																						key={state.name}
																						value={state.name}
																					>
																						{state.name}
																					</SelectItem>
																				))}
																		</SelectContent>
																	</Select>
																	{/* <Input
																value={subField.state.value}
																onChange={(e) =>
																	subField.handleChange(e.target.value)
																}
															/> */}
																</subField.FormItem>
															)}
														/>
													);
												}}
											/>
										</CardContent>
									</Card>
								);
							})}
							<Button
								type="button"
								variant="outline"
								onClick={() => field.pushValue(defaultStateNode)}
							>
								Add State
							</Button>
						</div>
					)}
				/>
				<Button type="submit">Create</Button>
			</form>
		</form.AppForm>
	);
}
