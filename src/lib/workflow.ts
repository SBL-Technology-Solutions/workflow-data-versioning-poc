import { __unsafe_getAllOwnEventDescriptors, createMachine } from "xstate";
import type { WorkflowInstancesSelect } from "@/db/schema";
import {
	type SerializableWorkflowMachineConfig,
	toMachineConfig,
} from "@/types/workflow";

/**
 * Gets the current workflow state information including resolved state and available events
 * @param machineConfig - The XState machine configuration
 * @param currentState - The current state of the workflow Instance
 * @returns An array of next events
 */
export const getNextEvents = (
	machineConfig: SerializableWorkflowMachineConfig,
	currentState: WorkflowInstancesSelect["currentState"],
): string[] => {
	try {
		const workflowMachine = createMachine(toMachineConfig(machineConfig));

		const resolvedState = workflowMachine.resolveState({
			value: currentState,
		});

		const nextEvents = __unsafe_getAllOwnEventDescriptors(resolvedState);

		return nextEvents;
	} catch (error) {
		console.error(error);
		return [];
	}
};
