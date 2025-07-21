import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import * as z from "zod/v4";
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

const getFormDataVersionsQueryOptions = () => ({
	queryKey: formDataVersionQueryKeys.list(),
	queryFn: () => getFormDataVersions(),
});

const getLatestCurrentFormData = createServerFn({
	method: "GET",
})
	.validator(
		z.object({
			workflowInstanceId: z.number(),
			formDefId: z.number(),
		}),
	)
	.handler(async ({ data: { workflowInstanceId, formDefId } }) => {
		return DB.formDataVersion.queries.getLatestCurrentFormData(
			workflowInstanceId,
			formDefId,
		);
	});

const getLatestCurrentFormDataQueryOptions = (
	workflowInstanceId: number,
	formDefId: number,
) =>
	queryOptions({
		queryKey: formDataVersionQueryKeys.detail(workflowInstanceId, {
			formDefId,
		}),
		queryFn: () =>
			getLatestCurrentFormData({
				data: { workflowInstanceId, formDefId },
			}),
	});

const saveFormDataServerFn = createServerFn({
	method: "POST",
})
	.validator(
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
		getLatestCurrentFormDataQueryOptions,
	},
	queryKeys: formDataVersionQueryKeys,
	mutations: {
		saveFormDataServerFn,
	},
};
