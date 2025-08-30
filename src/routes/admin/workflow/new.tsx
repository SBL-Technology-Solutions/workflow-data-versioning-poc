import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { API } from "@/data/API";
import { getWorkflowStates } from "@/lib/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/workflow/new")({
	component: WorkflowNewRoute,
});

function WorkflowNewRoute() {
	const [name, setName] = useState("");
	const [machineConfigText, setMachineConfigText] = useState("");
	const [stateList, setStateList] = useState<string[]>([]);
	const [forms, setForms] = useState<
		Record<string, { formDefId?: string; schema?: string }>
	>({});

	const createWorkflow = useMutation({
		mutationFn: (data: any) =>
			API.workflowDefinition.mutations.createWorkflowDefinitionServerFn({
				data,
			}),
		onSuccess: () => toast.success("Workflow created"),
		onError: () => toast.error("Failed to create workflow"),
	});

	const parseStates = () => {
		try {
			const config = JSON.parse(machineConfigText);
			const states = getWorkflowStates(config);
			const init: Record<string, { formDefId?: string; schema?: string }> = {};
			for (const state of states) {
				init[state] = forms[state] || {};
			}
			setStateList(states);
			setForms(init);
		} catch {
			toast.error("Invalid machine config");
		}
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		try {
			const machineConfig = JSON.parse(machineConfigText);
			const formPayload: Record<string, any> = {};
			for (const state of stateList) {
				const info = forms[state];
				if (info.formDefId) {
					formPayload[state] = { formDefId: Number(info.formDefId) };
				} else if (info.schema) {
					formPayload[state] = { schema: JSON.parse(info.schema) };
				}
			}
			createWorkflow.mutate({ name, machineConfig, forms: formPayload });
		} catch {
			toast.error("Invalid input");
		}
	};

	return (
		<div className="space-y-6">
			<h2 className="text-xl font-semibold">New Workflow Definition</h2>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label className="mb-1 block">Name</label>
					<Input value={name} onChange={(e) => setName(e.target.value)} />
				</div>
				<div>
					<label className="mb-1 block">Machine Config (JSON)</label>
					<Textarea
						rows={10}
						value={machineConfigText}
						onChange={(e) => setMachineConfigText(e.target.value)}
					/>
					<Button type="button" className="mt-2" onClick={parseStates}>
						Load States
					</Button>
				</div>
				{stateList.map((state) => (
					<div key={state} className="rounded border p-4">
						<h3 className="mb-2 font-medium">{state}</h3>
						<div className="space-y-2">
							<div>
								<label className="mb-1 block">
									Existing Form Definition ID
								</label>
								<Input
									value={forms[state]?.formDefId || ""}
									onChange={(e) =>
										setForms({
											...forms,
											[state]: { ...forms[state], formDefId: e.target.value },
										})
									}
								/>
							</div>
							<div>
								<label className="mb-1 block">New Form Schema (JSON)</label>
								<Textarea
									rows={6}
									value={forms[state]?.schema || ""}
									onChange={(e) =>
										setForms({
											...forms,
											[state]: { ...forms[state], schema: e.target.value },
										})
									}
								/>
							</div>
						</div>
					</div>
				))}
				<Button type="submit" disabled={createWorkflow.isPending}>
					Create Workflow
				</Button>
			</form>
		</div>
	);
}
