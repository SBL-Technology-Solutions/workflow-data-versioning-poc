import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { FormSchema as zodFormSchema } from "@/lib/form";
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

const createWorkflowDefinitionServerFn = createServerFn({
	method: "POST",
})
	.validator(
		z.object({
			name: z.string(),
			machineConfig: z.record(z.any()),
			forms: z
				.record(
					z.object({
						formDefId: z.number().optional(),
						schema: zodFormSchema.optional(),
					}),
				)
				.optional(),
		}),
	)
	.handler(async ({ data: { name, machineConfig, forms } }) =>
		DB.workflowDefinition.mutations.createWorkflowDefinition(
			name,
			machineConfig,
			forms,
		),
	);

export const workflowDefinition = {
	queries: {
		getWorkflowDefinitionsQueryOptions,
		getWorkflowDefinitionbyIdQueryOptions,
	},
	mutations: {
		createWorkflowDefinitionServerFn,
	},
	queryKeys: workflowDefinitionQueryKeys,
} as const;
