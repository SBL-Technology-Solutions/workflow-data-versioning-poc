import {
	createFileRoute,
	useNavigate,
	useSearch,
} from "@tanstack/react-router";
import * as z from "zod";
import { FormBuilder } from "@/components/FormBuilder";
import { StateSelector } from "@/components/StateSelector";
import workflowDefinitionCollection from "@/data/collections/workflowDefinition";
import workflowDefinitionFormDefinitionMapCollection from "@/data/collections/workflowDefinitionFormDefinitionMap";
import formDefinitionCollection from "@/data/collections/formDefinition";
import { and, eq, useLiveQuery } from "@tanstack/react-db";
import { useEffect } from "react";

const workflowDefinitionSearchSchema = z.object({
	state: z.string().catch(""),
});

export const Route = createFileRoute("/admin/workflow/$workflowId/forms/")({
	component: RouteComponent,
	validateSearch: workflowDefinitionSearchSchema,
});

function RouteComponent() {
	const { workflowId } = Route.useParams();
	const { state: urlState } = useSearch({ from: "/admin/workflow/$workflowId/forms/" });
	const navigate = useNavigate();

	// Get workflow definition to access its states array
    const { data: workflowDef } = useLiveQuery(
        (q) =>
            q
                .from({ wd: workflowDefinitionCollection })
                .where(({ wd }) => eq(wd.id, Number(workflowId)))
                .select(({ wd }) => ({
                    states: wd.states,
                })),
        [workflowId]
    );

	// Navigate to first state if no state is in URL
    useEffect(() => {
        if (!urlState && workflowDef?.[0]?.states?.length) {
            navigate({
                to: "/admin/workflow/$workflowId/forms",
                params: { workflowId },
                search: { state: workflowDef[0].states[0] },
                replace: true,
            });
        }
    }, [urlState, workflowDef, navigate, workflowId]);

	const { data: workflowDefinitionsAndFormDefinitions } = useLiveQuery((q) =>
		q
			.from({ wd: workflowDefinitionCollection })
			.innerJoin(
				{ map: workflowDefinitionFormDefinitionMapCollection},
				({ wd, map }) => eq(wd.id, map.workflowDefinitionId ),
			)
			.innerJoin(
				{ fd: formDefinitionCollection },
				({ map, fd }) => eq(map.formDefinitionId, fd.id),
			)
			.where(({ wd, fd }) => 
				and(
					eq(wd.id, Number(workflowId)),
					eq(fd.state, urlState)
				)
			)
			.orderBy(({ fd }) => fd.version, 'desc')
			.limit(1)
			.select(({ wd, fd }) => ({
				workflowDefId: wd.id,
				workflowDefName: wd.name,
				states: wd.states,
				state: fd.state,
				formDefId: fd.id,
				schema: fd.schema,
				version: fd.version,
			})),
		[workflowId, urlState]
	)

	const latestWorkflowDefFormDef = workflowDefinitionsAndFormDefinitions[0];

	const handleStateChange = (newState: string) => {
		navigate({
			to: "/admin/workflow/$workflowId/forms",
			params: { workflowId },
			search: { state: newState },
		});
	};

	return (
		<div className="container mx-auto p-4">
			<div className="flex justify-between items-center mb-6">
				<div className="space-y-2">
					<h1 className="text-2xl font-bold">
						Edit Form: {latestWorkflowDefFormDef?.workflowDefName}
					</h1>
					<StateSelector
						states={latestWorkflowDefFormDef?.states ?? []}
						currentState={urlState}
						onStateChange={handleStateChange}
					/>
				</div>
			</div>
			<FormBuilder
				initialSchema={
					latestWorkflowDefFormDef?.schema ?? {
						title: "",
						fields: [],
					}
				}
				workflowId={Number(workflowId)}
				state={urlState}
				key={`${workflowId}-${urlState}-${latestWorkflowDefFormDef?.formDefId ?? "new"}`}
			/>
		</div>
	);
}
