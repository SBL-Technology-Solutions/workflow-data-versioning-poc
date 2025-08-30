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

/**
 * Extracts all non-final leaf state paths from an XState machine configuration.
 * Paths are dot-delimited for nested states (e.g., "review.market.pending").
 *
 * @param machineConfig - The XState machine configuration
 * @returns An array of state paths requiring forms
 */
export const getWorkflowStates = (
	machineConfig: Record<string, any>,
): string[] => {
	const states: string[] = [];
	const queue: { node: any; path: string[] }[] = [
		{ node: machineConfig, path: [] },
	];

	while (queue.length) {
		const { node, path } = queue.shift()!;

		if (!node?.states) {
			if (node?.type !== "final" && path.length) {
				states.push(path.join("."));
			}
			continue;
		}

		for (const [key, value] of Object.entries(node.states)) {
			queue.push({ node: value, path: [...path, key] });
		}
	}

	return states;
};
