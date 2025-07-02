import type { FormSchema } from "./form";

export interface WorkflowDefinition {
	id: number;
	name: string;
	version: number;
	machineConfig?: {
		id: string;
		initial: string;
		states: Record<
			string,
			{
				on?: Record<string, string>;
			}
		>;
	};
	states?: string[];
	createdAt: Date;
	updatedAt: Date;
}

export interface WorkflowFormDefinition {
	id: number;
	workflowDefId: number;
	formDefId: number;
	state: string;
	createdAt: Date;
	updatedAt: Date;
}

export interface FormDefinition {
	id: number;
	version: number;
	schema: FormSchema;
	createdAt: Date;
	updatedAt: Date;
}
