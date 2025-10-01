import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod";
import { DB } from "../DB";

const formDataVersionQueryKeys = {
	all: () => ["formDataVersions"] as const,
	lists: () => [...formDataVersionQueryKeys.all(), "list"] as const,
	list: () => [...formDataVersionQueryKeys.lists()] as const,
	details: () => [...formDataVersionQueryKeys.all(), "detail"] as const,
	detail: (workflowInstanceId: number, otherDetails?: Record<string, any>) =>
		otherDetails !== undefined
			? ([
					...formDataVersionQueryKeys.details(),
					workflowInstanceId,
					otherDetails,
				] as const)
			: ([...formDataVersionQueryKeys.details(), workflowInstanceId] as const),
} as const;

const getFormDataVersions = createServerFn({
	method: "GET",
}).handler(async () => {
	return DB.formDataVersion.queries.getFormDataVersions();
});

const getFormDataVersionsQueryOptions = () =>
	queryOptions({
		queryKey: formDataVersionQueryKeys.list(),
		queryFn: () => getFormDataVersions(),
	});

const getCurrentFormDataForWorkflowInstanceServerFn = createServerFn({
	method: "GET",
})
	.inputValidator(
		z.object({
			workflowInstanceId: z.number(),
			state: z.string().optional(),
		}),
	)
	.handler(async ({ data: { workflowInstanceId, state } }) => {
		return DB.formDataVersion.queries.getCurrentFormDataForWorkflowInstance(
			workflowInstanceId,
			state,
		);
	});

const getCurrentFormDataForWorkflowInstanceQueryOptions = (
	workflowInstanceId: number,
	state?: string,
) =>
	queryOptions({
		queryKey: formDataVersionQueryKeys.detail(workflowInstanceId, { state }),
		queryFn: () =>
			getCurrentFormDataForWorkflowInstanceServerFn({
				data: { workflowInstanceId, state },
			}),
	});

const saveFormDataServerFn = createServerFn({
	method: "POST",
})
	.inputValidator(
		z.object({
			workflowInstanceId: z.number(),
			formDefId: z.number(),
			data: z.any(),
		}),
	)
	.handler(async ({ data: { workflowInstanceId, formDefId, data } }) => {
		return DB.formDataVersion.mutations.saveFormData(
			workflowInstanceId,
			formDefId,
			data,
		);
	});

export const formDataVersion = {
	queries: {
		getFormDataVersionsQueryOptions,
		getCurrentFormDataForWorkflowInstanceQueryOptions,
	},
	queryKeys: formDataVersionQueryKeys,
	mutations: {
		saveFormDataServerFn,
	},
};
