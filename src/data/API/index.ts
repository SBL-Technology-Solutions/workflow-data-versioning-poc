import { formDataVersion } from "./formDataVersion";
import { workflowDefinition } from "./workflowDefinition";
import { workflowInstance } from "./workflowInstance";

export const API = {
	workflowInstance,
	workflowDefinition,
	formDataVersion,
} as const;

export type { WorkflowInstance } from "./workflowInstance";
