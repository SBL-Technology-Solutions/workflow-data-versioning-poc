import { formDataVersion } from "./formDataVersion";
import { formDefinition } from "./formDefinition";
import { workflowDefinition } from "./workflowDefinition";
import { workflowDefinitionFormDefinitionMap } from "./workflowDefinitionFormDefinitionMap";
import { workflowInstance } from "./workflowInstance";

export const API = {
	workflowInstance,
	workflowDefinition,
	formDataVersion,
	formDefinition,
	workflowDefinitionFormDefinitionMap,
} as const;

export type { WorkflowInstance } from "./workflowInstance";
