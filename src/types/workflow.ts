import type { EventObject, MachineConfig, MachineContext } from "xstate";

export type XStateMachineConfig = MachineConfig<
	MachineContext, // Context type
	EventObject // Event type
	// We omit the other generic parameters to use defaults
>;
