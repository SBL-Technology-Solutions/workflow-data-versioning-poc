import { describe, expect, it } from "vitest";
import { getNextEvents } from "@/lib/workflow";

describe("lib/workflow.getNextEvents", () => {
	const machineConfig = {
		initial: "form1",
		states: {
			form1: { on: { NEXT: "form2" } },
			form2: { type: "final" },
		},
	} as const;

	it("returns available next events for a non-final state", () => {
		const events = getNextEvents(machineConfig as any, "form1");
		expect(Array.isArray(events)).toBe(true);
		expect(events).toContain("NEXT");
	});

	it("returns empty array for a final state", () => {
		const events = getNextEvents(machineConfig as any, "form2");
		expect(Array.isArray(events)).toBe(true);
		expect(events.length).toBe(0);
	});

	it("returns all distinct event names when multiple transitions exist", () => {
		const cfg = {
			initial: "A",
			states: {
				A: { on: { SAVE: "A", NEXT: "B", CANCEL: "A" } },
				B: { type: "final" },
			},
		} as const;

		const events = getNextEvents(cfg as any, "A");
		expect(events.sort()).toEqual(["CANCEL", "NEXT", "SAVE"].sort());
	});
});
