import { __unsafe_getAllOwnEventDescriptors, createMachine } from "xstate";
import type { WorkflowInstance } from "@/data/API/workflowInstance";

/**
 * Gets the current workflow state information including resolved state and available events
 * @param machineConfig - The XState machine configuration
 * @param workflowInstance - The current workflow instance
 * @returns An array of next events
 */
export const getNextEvents = (
	machineConfig: Record<string, unknown>,
	workflowInstance: WorkflowInstance,
): string[] => {
	const workflowMachine = createMachine(machineConfig);

	const resolvedState = workflowMachine.resolveState({
		value: workflowInstance.currentState,
	});

	const nextEvents = __unsafe_getAllOwnEventDescriptors(resolvedState);

	return nextEvents;
};
