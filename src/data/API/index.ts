import { formDataVersion } from "./formDataVersion";
import { formDefinition } from "./formDefinition";
import { workflowDefinition } from "./workflowDefinition";
import { workflowInstance } from "./workflowInstance";

export const API = {
	workflowInstance,
	workflowDefinition,
	formDataVersion,
	formDefinition,
} as const;

export type { WorkflowInstance } from "./workflowInstance";
