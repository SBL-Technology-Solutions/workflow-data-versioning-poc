import { workflowDefinition } from "./workflowDefinition";
import { workflowInstance } from "./workflowInstance";

export const DB = {
	workflowInstance,
	workflowDefinition,
} as const;
