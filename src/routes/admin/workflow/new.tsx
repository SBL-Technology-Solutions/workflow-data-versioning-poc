import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { API } from "@/data/API";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/workflow/new")({
	component: WorkflowNewRoute,
});

type Step = {
	id: number;
	name: string;
	description: string;
	formDefId: string;
	schema: string;
	next: string;
	terminal: boolean;
};

function WorkflowNewRoute() {
	const [name, setName] = useState("");
	const [steps, setSteps] = useState<Step[]>([
		{
			id: Date.now(),
			name: "",
			description: "",
			formDefId: "",
			schema: "",
			next: "",
			terminal: false,
		},
	]);

	const createWorkflow = useMutation({
		mutationFn: (data: any) =>
			API.workflowDefinition.mutations.createWorkflowDefinitionServerFn({
				data,
			}),
		onSuccess: () => toast.success("Workflow created"),
		onError: () => toast.error("Failed to create workflow"),
	});

	const updateStep = (
		id: number,
		field: keyof Step,
		value: string | boolean,
	) => {
		setSteps((prev) =>
			prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
		);
	};

	const addStep = () => {
		setSteps((prev) => [
			...prev,
			{
				id: Date.now(),
				name: "",
				description: "",
				formDefId: "",
				schema: "",
				next: "",
				terminal: false,
			},
		]);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const states: Record<string, any> = {};
			const forms: Record<string, any> = {};

			for (const step of steps) {
				if (!step.name) throw new Error("step name");
				const meta = { description: step.description };
				if (step.terminal) {
					states[step.name] = { type: "final", meta };
					continue;
				}

				if (!step.next) throw new Error("next step");
				if (!step.formDefId && !step.schema) throw new Error("form");

				states[step.name] = {
					on: { NEXT: step.next },
					meta,
				};

				if (step.formDefId) {
					forms[step.name] = {
						formDefId: Number(step.formDefId),
					};
				} else {
					forms[step.name] = {
						schema: JSON.parse(step.schema),
					};
				}
			}

			const machineConfig = {
				id: name,
				initial: steps[0]?.name,
				states,
			};

			createWorkflow.mutate({
				name,
				machineConfig,
				forms,
			});
		} catch {
			toast.error("Invalid input");
		}
	};

	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold">New Workflow Definition</h2>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<Label className="mb-1 block">Name</Label>
					<Input value={name} onChange={(e) => setName(e.target.value)} />
				</div>
				{steps.map((step) => (
					<div key={step.id} className="rounded border p-4 space-y-2">
						<div>
							<Label className="mb-1 block">Step Name</Label>
							<Input
								value={step.name}
								onChange={(e) => updateStep(step.id, "name", e.target.value)}
							/>
						</div>
						<div>
							<Label className="mb-1 block">Description</Label>
							<Textarea
								rows={2}
								value={step.description}
								onChange={(e) =>
									updateStep(step.id, "description", e.target.value)
								}
							/>
						</div>
						<div className="flex items-center gap-2 py-1">
							<Checkbox
								id={`term-${step.id}`}
								checked={step.terminal}
								onCheckedChange={(v) =>
									updateStep(step.id, "terminal", v === true)
								}
							/>
							<Label htmlFor={`term-${step.id}`}>Terminal step</Label>
						</div>
						{!step.terminal && (
							<>
								<div>
									<Label className="mb-1 block">
										Existing Form Definition ID
									</Label>
									<Input
										value={step.formDefId}
										onChange={(e) =>
											updateStep(step.id, "formDefId", e.target.value)
										}
									/>
								</div>
								<div>
									<Label className="mb-1 block">New Form Schema (JSON)</Label>
									<Textarea
										rows={4}
										value={step.schema}
										onChange={(e) =>
											updateStep(step.id, "schema", e.target.value)
										}
									/>
								</div>
								<div>
									<Label className="mb-1 block">Next Step</Label>
									<Input
										value={step.next}
										onChange={(e) =>
											updateStep(step.id, "next", e.target.value)
										}
										list={`steps-${step.id}`}
									/>
									<datalist id={`steps-${step.id}`}>
										{steps
											.filter((s) => s.id !== step.id)
											.map((s) => (
												<option key={s.id} value={s.name} />
											))}
									</datalist>
								</div>
							</>
						)}
					</div>
				))}
				<Button type="button" onClick={addStep} variant="secondary">
					Add Step
				</Button>
				<Button type="submit" disabled={createWorkflow.isPending}>
					Create Workflow
				</Button>
			</form>
		</div>
	);
}
