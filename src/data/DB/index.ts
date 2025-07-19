import { formDataVersion } from "./formDataVersion";
import { workflowDefinition } from "./workflowDefinition";
import { workflowInstance } from "./workflowInstance";

export const DB = {
	workflowInstance,
	workflowDefinition,
	formDataVersion,
} as const;
