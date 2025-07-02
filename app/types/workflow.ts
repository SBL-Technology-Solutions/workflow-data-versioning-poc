import { type FormSchema } from "./form";

export interface WorkflowDefinition {
	id: number;
	name: string;
	machineConfig: {
		id: string;
		initial: string;
		states: Record<
			string,
			{
				on?: Record<string, string>;
			}
		>;
	};
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
