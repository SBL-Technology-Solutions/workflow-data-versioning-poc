import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { FormSchema as zodFormSchema } from "@/lib/form";
import { DB } from "../DB";

const formDefinitionQueryKeys = {
	all: () => ["formDefinitions"] as const,
	lists: () => [...formDefinitionQueryKeys.all(), "list"] as const,
	list: () => [...formDefinitionQueryKeys.lists()] as const,
	details: () => [...formDefinitionQueryKeys.all(), "detail"] as const,
	detail: (id: number, otherDetails?: Record<string, any>) =>
		otherDetails !== undefined
			? ([...formDefinitionQueryKeys.details(), id, otherDetails] as const)
			: ([...formDefinitionQueryKeys.details(), id] as const),
	definitionbyWorkflowInstanceId: (workflowInstanceId: number, state: string) =>
		[
			...formDefinitionQueryKeys.all(),
			"definitionbyWorkflowInstanceId",
			workflowInstanceId,
			state,
		] as const,
} as const;

export const getFormDefinitions = createServerFn({
	method: "GET",
}).handler(async () => {
	return DB.formDefinition.queries.getFormDefinitions();
});

const getFormDefinitionsQueryOptions = () => ({
	queryKey: formDefinitionQueryKeys.list(),
	queryFn: () => getFormDefinitions(),
});

const getCurrentFormDefinitionByWorkflowDefIdServerFn = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			workflowDefId: z.number(),
			state: z.string().optional(),
		}),
	)
	.handler(async ({ data: { workflowDefId, state } }) => {
		return DB.formDefinition.queries.getCurrentFormForWorkflowDefId(
			workflowDefId,
			state,
		);
	});

const getCurrentFormDefinitionByWorkflowDefIdQueryOptions = (
	workflowDefId: number,
	state?: string,
) => ({
	queryKey: formDefinitionQueryKeys.detail(workflowDefId, { state }),
	queryFn: () =>
		getCurrentFormDefinitionByWorkflowDefIdServerFn({
			data: { workflowDefId, state },
		}),
});

const createFormVersionServerFn = createServerFn({
	method: "POST",
})
	.inputValidator(
		z.object({
			workflowDefId: z.number(),
			state: z.string(),
			schema: zodFormSchema,
		}),
	)
	.handler(async ({ data: { workflowDefId, state, schema } }) =>
		DB.formDefinition.mutations.createFormVersion(workflowDefId, state, schema),
	);

export const formDefinition = {
	queries: {
		getFormDefinitionsQueryOptions,
		getCurrentFormDefinitionByWorkflowDefIdQueryOptions,
	},
	mutations: {
		createFormVersionServerFn,
	},
	queryKeys: formDefinitionQueryKeys,
};
