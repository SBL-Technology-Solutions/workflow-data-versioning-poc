import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { DB } from "../DB";

const workflowDefinitionQueryKeys = {
	all: () => ["workflowDefinitions"] as const,
	lists: () => [...workflowDefinitionQueryKeys.all(), "list"] as const,
	list: () => [...workflowDefinitionQueryKeys.lists()] as const,
	details: () => [...workflowDefinitionQueryKeys.all(), "detail"] as const,
	detail: (id: number) =>
		[...workflowDefinitionQueryKeys.details(), id] as const,
} as const;

export const getWorkflowDefinitionsFn = createServerFn({
	method: "GET",
}).handler(async () => {
	return DB.workflowDefinition.queries.getWorkflowDefinitions();
});

export const getWorkflowDefinitionsQueryOptions = () => ({
	queryKey: workflowDefinitionQueryKeys.list(),
	queryFn: () => getWorkflowDefinitionsFn(),
});

export const getWorkflowDefinitionbyIdFn = createServerFn({
	method: "GET",
})
	.validator(z.object({ id: z.number() }))
	.handler(async ({ data: { id } }) =>
		DB.workflowDefinition.queries.getWorkflowDefinition(id),
	);

export const getWorkflowDefinitionbyIdQueryOptions = (id: number) =>
	queryOptions({
		queryKey: workflowDefinitionQueryKeys.detail(id),
		queryFn: () => getWorkflowDefinitionbyIdFn({ data: { id } }),
	});

export const workflowDefinition = {
	queries: {
		getWorkflowDefinitionsQueryOptions,
		getWorkflowDefinitionbyIdQueryOptions,
	},
	queryKeys: workflowDefinitionQueryKeys,
	mutations: {
        createWorkflowDefinitionServerFn: createServerFn({ method: "POST" })
            .validator(
                z.object({
                    name: z.string().min(1, "Name is required"),
                    steps: z
                        .array(
                            z.object({
                                name: z.string().min(1),
                                move: z.enum(["forward", "backward", "both", "terminal"]),
                                formDefId: z.number().optional().nullable(),
                            }),
                        )
                        .min(1, "At least one step is required"),
                }),
            )
            .handler(async ({ data }) => {
                return DB.workflowDefinition.mutations.createWorkflowDefinition({
                    name: data.name,
                    steps: data.steps,
                });
            }),
    },
} as const;
