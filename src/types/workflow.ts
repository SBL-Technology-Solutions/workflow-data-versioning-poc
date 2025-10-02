import type {
	EventObject,
	MachineConfig,
	MachineContext,
	SingleOrArray,
	StateNodeConfig,
	TransitionTarget,
} from "xstate";

type AnyStateNodeConfig = StateNodeConfig<
	MachineContext,
	EventObject,
	any,
	any,
	any,
	string,
	string,
	unknown,
	EventObject,
	any
>;

type SerializableStateType = NonNullable<AnyStateNodeConfig["type"]>;

type SerializableTransition = TransitionTarget | { target: TransitionTarget };

export type SerializableStateNode = {
	type?: SerializableStateType;
	initial?: string;
	on?: Record<string, SingleOrArray<SerializableTransition>>;
	always?: SingleOrArray<SerializableTransition>;
	states?: Record<string, SerializableStateNode>;
};

export type SerializableWorkflowMachineConfig = {
	initial: string;
	states: Record<string, SerializableStateNode>;
};

//TODO: fix this type casting and do some validation
export const toMachineConfig = (
	config: SerializableWorkflowMachineConfig,
): MachineConfig<MachineContext, EventObject> =>
	config as unknown as MachineConfig<MachineContext, EventObject>;
