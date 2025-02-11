import { createMachine, createActor } from 'xstate';

export function createWorkflowMachine(name: string, machineConfig: any) {
    const machine = createMachine({
        id: name,
        ...machineConfig,
    });
    console.log("machine", machine);

    return machine;
}

export function createWorkflowActor(name: string, machineConfig: any) {
  const machine = createMachine({
    id: name,
    ...machineConfig,
  });
  console.log("machine", machine);

  return createActor(machine);
}