import { __unsafe_getAllOwnEventDescriptors, createMachine } from "xstate";

/**
 * Gets the current workflow state information including resolved state and available events
 * @param machineConfig - The XState machine configuration
 * @param currentState - The current state of the workflow Instance
 * @returns An array of next events
 */
export const getNextEvents = (
	machineConfig: Record<string, unknown>,
	currentState: string,
): string[] => {
	const workflowMachine = createMachine(machineConfig);

	const resolvedState = workflowMachine.resolveState({
		value: currentState,
	});

	const nextEvents = __unsafe_getAllOwnEventDescriptors(resolvedState);

	return nextEvents;
};
