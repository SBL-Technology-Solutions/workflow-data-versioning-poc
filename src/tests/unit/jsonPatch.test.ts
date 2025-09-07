
/* ======================================================================
   Unit tests for createJSONPatch
   Test framework: Jest or Vitest (describe/it/expect provided as globals)
   These tests focus on happy paths, edge cases, and failure-like scenarios.
====================================================================== */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* Hint for TS in case globals aren't typed */
declare const describe: any, it: any, expect: any;

describe("createJSONPatch", () => {
	it("returns an empty patch when objects are identical", () => {
		const oldObj = { a: "1", b: "2" };
		const newObj = { a: "1", b: "2" };

		const patch = createJSONPatch(oldObj, newObj);

		expect(Array.isArray(patch)).toBe(true);
		expect(patch).toEqual([]);
	});

	it("produces an add operation for a new key", () => {
		const oldObj = {};
		const newObj = { a: "1" };

		const patch = createJSONPatch(oldObj as Record<string, string>, newObj);

		expect(patch).toHaveLength(1);
		expect(patch).toEqual([
			expect.objectContaining({ op: "add", path: "/a", value: "1" }),
		]);
	});

	it("produces a remove operation when a key is deleted", () => {
		const oldObj = { doomed: "x" };
		const newObj = {};

		const patch = createJSONPatch(oldObj, newObj as Record<string, string>);

		expect(patch).toHaveLength(1);
		// remove operations must not include "value"
		expect(patch).toEqual([
			expect.objectContaining({ op: "remove", path: "/doomed" }),
		]);
	});

	it("produces a replace operation when a value changes", () => {
		const oldObj = { ver: "1" };
		const newObj = { ver: "2" };

		const patch = createJSONPatch(oldObj, newObj);

		expect(patch).toHaveLength(1);
		expect(patch).toEqual([
			expect.objectContaining({ op: "replace", path: "/ver", value: "2" }),
		]);
	});

	it("handles mixed add/remove/replace operations (order-agnostic)", () => {
		const oldObj = { a: "1", b: "2" };
		const newObj = { b: "3", c: "4" };

		const patch = createJSONPatch(oldObj, newObj);

		expect(patch).toHaveLength(3);
		expect(patch).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ op: "remove", path: "/a" }),
				expect.objectContaining({ op: "replace", path: "/b", value: "3" }),
				expect.objectContaining({ op: "add", path: "/c", value: "4" }),
			]),
		);
	});

	it("does not emit operations for unchanged keys", () => {
		const oldObj = { common: "x", keep: "y", change: "1" };
		const newObj = { common: "x", keep: "y", change: "2" };

		const patch = createJSONPatch(oldObj, newObj);

		// Only 'replace' for /change should be present
		expect(patch).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ op: "replace", path: "/change", value: "2" }),
			]),
		);
		expect(patch.find((p) => p.path === "/common")).toBeUndefined();
		expect(patch.find((p) => p.path === "/keep")).toBeUndefined();
	});

	it('escapes "/" in keys per RFC 6901 ("/" -> "~1")', () => {
		const oldObj = {};
		const newObj = { "a/b": "val" };

		const patch = createJSONPatch(oldObj as Record<string, string>, newObj);

		expect(patch).toHaveLength(1);
		expect(patch).toEqual([
			expect.objectContaining({ op: "add", path: "/a~1b", value: "val" }),
		]);
		// Defensive: ensure the unescaped path is not used
		expect(patch).not.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ path: "/a/b" }),
			]),
		);
	});

	it('escapes "~" in keys per RFC 6901 ("~" -> "~0")', () => {
		const oldObj = {};
		const newObj = { "a~b": "val" };

		const patch = createJSONPatch(oldObj as Record<string, string>, newObj);

		expect(patch).toHaveLength(1);
		expect(patch).toEqual([
			expect.objectContaining({ op: "add", path: "/a~0b", value: "val" }),
		]);
	});

	it("generates no-ops across transpositions of key order", () => {
		// Object key order should not influence diff
		const oldObj = { a: "1", b: "2", c: "3" };
		const newObj = { c: "3", b: "2", a: "1" };

		const patch = createJSONPatch(oldObj, newObj);

		expect(patch).toEqual([]);
	});

	it("handles empty-to-empty objects", () => {
		const patch = createJSONPatch({}, {});
		expect(patch).toEqual([]);
	});
});