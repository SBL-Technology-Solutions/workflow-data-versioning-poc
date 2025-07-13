import type { UseQueryOptions } from "@tanstack/react-query";
import { workflowInstance } from "./workflowInstance";

export const API = {
	workflowInstance,
} as const;

export type WorkflowInstance = ReturnType<
	typeof API.workflowInstance.queries.getWorkflowInstanceByIdQueryOptions
> extends UseQueryOptions<infer TData, any, any, any>
	? TData
	: never;
