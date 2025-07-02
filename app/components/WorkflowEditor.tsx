import { getCurrentFormForDefinitionQueryOptions } from "@/data/formDefinitions";
import { updateWorkflowDefinitionServerFn } from "@/data/workflowDefinitions";
import { type WorkflowDefinition } from "@/types/workflow";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";

interface WorkflowEditorProps {
	workflowDefinition: WorkflowDefinition;
}

type StateConfig = {
	on?: Record<string, string>;
};

export function WorkflowEditor({ workflowDefinition }: WorkflowEditorProps) {
	const [states, setStates] = useState<string[]>(
		Object.keys(workflowDefinition.machineConfig.states),
	);
	const [newStateName, setNewStateName] = useState("");
	const [selectedState, setSelectedState] = useState<string | null>(null);
	const [formDefIds, setFormDefIds] = useState<Record<string, number>>({});

	// Fetch form definitions for each state
	const formQueries = states.map((state) => {
		const { data: formDef } = useQuery({
			...getCurrentFormForDefinitionQueryOptions(workflowDefinition.id, state),
		});
		return { state, formDef };
	});

	// Update formDefIds when form definitions are loaded
	useEffect(() => {
		const newFormDefIds: Record<string, number> = {};
		for (const { state, formDef } of formQueries) {
			if (formDef?.formDefId) {
				newFormDefIds[state] = formDef.formDefId;
			}
		}
		setFormDefIds(newFormDefIds);
	}, [formQueries]);

	const handleAddState = useCallback(() => {
		if (!newStateName) return;
		if (states.includes(newStateName)) {
			toast.error("State name already exists");
			return;
		}
		setStates([...states, newStateName]);
		setNewStateName("");
	}, [newStateName, states]);

	const handleRemoveState = useCallback(
		(stateToRemove: string) => {
			setStates(states.filter((state) => state !== stateToRemove));
			if (selectedState === stateToRemove) {
				setSelectedState(null);
			}
		},
		[states, selectedState],
	);

	const handleSave = useCallback(async () => {
		try {
			// Create a linear workflow configuration
			const machineConfig = {
				id: "workflow",
				initial: states[0],
				states: states.reduce(
					(acc, state, index) => {
						acc[state] = {
							on: {
								NEXT: index < states.length - 1 ? states[index + 1] : undefined,
								PREVIOUS: index > 0 ? states[index - 1] : undefined,
							},
						};
						return acc;
					},
					{} as Record<string, StateConfig>,
				),
			};

			await updateWorkflowDefinitionServerFn({
				data: {
					id: workflowDefinition.id,
					machineConfig,
					formDefIds,
				},
			});

			toast.success("Workflow definition saved successfully");
		} catch (error) {
			toast.error("Failed to save workflow definition");
		}
	}, [states, formDefIds, workflowDefinition.id]);

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Workflow States</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex gap-2">
						<Input
							value={newStateName}
							onChange={(e) => setNewStateName(e.target.value)}
							placeholder="New state name"
						/>
						<Button onClick={handleAddState}>Add State</Button>
					</div>
					<div className="space-y-2">
						{states.map((state) => (
							<div
								key={state}
								className="flex items-center justify-between p-2 border rounded"
							>
								<span>{state}</span>
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										onClick={() => setSelectedState(state)}
									>
										Edit Form
									</Button>
									<Button
										variant="destructive"
										size="sm"
										onClick={() => handleRemoveState(state)}
									>
										Remove
									</Button>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{selectedState && (
				<Card>
					<CardHeader>
						<CardTitle>Form Definition for {selectedState}</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="space-y-2">
								<Label>Form Definition</Label>
								<Select
									value={formDefIds[selectedState]?.toString()}
									onValueChange={(value) =>
										setFormDefIds({
											...formDefIds,
											[selectedState]: Number.parseInt(value, 10),
										})
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select a form definition" />
									</SelectTrigger>
									<SelectContent>
										{formQueries.find((q) => q.state === selectedState)?.formDef
											?.formDefId && (
											<SelectItem
												value={
													formQueries
														.find((q) => q.state === selectedState)
														?.formDef?.formDefId.toString() ?? ""
												}
											>
												Current Form
											</SelectItem>
										)}
									</SelectContent>
								</Select>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			<Button onClick={handleSave}>Save Workflow</Button>
		</div>
	);
}
