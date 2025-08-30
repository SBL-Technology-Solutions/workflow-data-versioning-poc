import { describe, expect, it } from "vitest";
import { getWorkflowStates } from "./workflow";

describe("getWorkflowStates", () => {
	it("returns non-final states for linear workflow", () => {
		const config = {
			initial: "form1",
			states: {
				form1: { on: { NEXT: "form2" } },
				form2: { type: "final" },
			},
		};
		expect(getWorkflowStates(config)).toEqual(["form1"]);
	});

	it("handles parallel workflows", () => {
		const config = {
			initial: "draft",
			states: {
				draft: { on: { SUBMIT: "review" } },
				review: {
					type: "parallel",
					states: {
						market: {
							initial: "pending",
							states: {
								pending: { on: { APPROVE: "approved" } },
								approved: { type: "final" },
								rejected: { type: "final" },
							},
						},
						credit: {
							initial: "pending",
							states: {
								pending: { on: { APPROVE: "approved" } },
								approved: { type: "final" },
								rejected: { type: "final" },
							},
						},
					},
				},
				completed: { type: "final" },
			},
		};
		expect(getWorkflowStates(config)).toEqual([
			"draft",
			"review.market.pending",
			"review.credit.pending",
		]);
	});
});
