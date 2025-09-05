import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { API } from "@/data/API";

type Move = "forward" | "backward" | "both" | "terminal";

interface StepDraft {
	name: string;
	move: Move;
	formDefId?: number | null;
}

export const Route = createFileRoute("/workflows/new")({
	component: RouteComponent,
	loader: async ({ context }) => {
		return context.queryClient.ensureQueryData(
			API.formDefinition.queries.getFormDefinitionsQueryOptions(),
		);
	},
});

function RouteComponent() {
	const navigate = useNavigate();
	const { data: allFormDefs } = useSuspenseQuery(
		API.formDefinition.queries.getFormDefinitionsQueryOptions(),
	);

	const [name, setName] = useState("");
	const [steps, setSteps] = useState<StepDraft[]>([
		{ name: "step1", move: "forward", formDefId: null },
		{ name: "step2", move: "terminal", formDefId: null },
	]);

	const createMutation = useMutation({
		mutationFn: (payload: { name: string; steps: StepDraft[] }) =>
			API.workflowDefinition.mutations.createWorkflowDefinitionServerFn({
				data: payload,
			}),
		onSuccess: (wf) => {
			toast.success("Workflow definition created");
			navigate({ to: "/" });
		},
		onError: (e) => {
			toast.error("Failed to create workflow definition", {
				description: e instanceof Error ? e.message : String(e),
			});
		},
	});

	const addStep = () => {
		const idx = steps.length + 1;
		setSteps((s) => [...s, { name: `step${idx}`, move: "terminal", formDefId: null }]);
	};

	const removeStep = (i: number) => {
		setSteps((s) => s.filter((_, idx) => idx !== i));
	};

	const updateStep = (i: number, patch: Partial<StepDraft>) => {
		setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, ...patch } : st)));
	};

	const formDefsByState = useMemo(() => {
		const map = new Map<string, Array<(typeof allFormDefs)[number]>>();
		for (const fd of allFormDefs) {
			const arr = map.get(fd.state) ?? [];
			arr.push(fd);
			map.set(fd.state, arr);
		}
		return map;
	}, [allFormDefs]);

	return (
		<div className="container mx-auto p-6 space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">New Workflow Definition</h1>
				<Link to="/">
					<Button variant="outline">Back to Dashboard</Button>
				</Link>
			</div>

			<div className="space-y-2">
				<Label htmlFor="wf-name">Workflow Name</Label>
				<Input
					id="wf-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="e.g. Loan Application"
				/>
			</div>

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-xl font-semibold">Steps</h2>
					<Button onClick={addStep} variant="secondary">
						Add Step
					</Button>
				</div>

				{steps.map((step, i) => {
					const relevant = formDefsByState.get(step.name) ?? [];
					return (
						<div key={i} className="border rounded p-4 space-y-3">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div className="space-y-2">
									<Label htmlFor={`name-${i}`}>Step Name</Label>
									<Input
										id={`name-${i}`}
										value={step.name}
										onChange={(e) => updateStep(i, { name: e.target.value })}
										placeholder={`step${i + 1}`}
									/>
								</div>
								<div className="space-y-2">
									<Label>Allowed Moves</Label>
									<Select
										value={step.move}
										onValueChange={(v) => updateStep(i, { move: v as Move })}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="forward">Forward (NEXT)</SelectItem>
											<SelectItem value="backward">Backward (BACK)</SelectItem>
											<SelectItem value="both">Both</SelectItem>
											<SelectItem value="terminal">Terminal</SelectItem>
										</SelectContent>
									</Select>
								</div>
								<div className="space-y-2">
									<Label>Form Definition</Label>
									<Select
										value={step.formDefId ? String(step.formDefId) : ""}
										onValueChange={(v) =>
											updateStep(i, { formDefId: v ? Number(v) : null })
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="None (create later)" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="">None (create later)</SelectItem>
											{relevant.map((fd) => (
												<SelectItem key={fd.id} value={String(fd.id)}>
													{`${fd.state} v${fd.version} — ${fd.schema.title ?? "Untitled"}`}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
							</div>
							<div className="flex justify-between">
								<div className="text-sm text-muted-foreground">
									{i === 0 ? "Initial state" : null}
								</div>
								<Button
									variant="outline"
									disabled={steps.length <= 1}
									onClick={() => removeStep(i)}
								>
									Remove
								</Button>
							</div>
						</div>
					);
				})}
			</div>

			<div className="flex gap-2">
				<Button
					disabled={!name || !steps.length || createMutation.isPending}
					onClick={() => createMutation.mutate({ name, steps })}
				>
					{createMutation.isPending ? "Creating..." : "Create Workflow"}
				</Button>
				<Button
					variant="outline"
					onClick={() => navigate({ to: "/" })}
				>
					Cancel
				</Button>
			</div>
		</div>
	);
}

