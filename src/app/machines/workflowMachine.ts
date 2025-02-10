import { createMachine } from 'xstate';

export function createWorkflowMachine(name: string, machineConfig: any) {
  return createMachine({
    id: name,
    ...machineConfig,
  });
}