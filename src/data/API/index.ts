import { workflowDefinition } from "./workflowDefinition";
import { workflowInstance } from "./workflowInstance";

export const API = {
	workflowInstance,
	workflowDefinition,
} as const;

export type { WorkflowInstance } from "./workflowInstance";
