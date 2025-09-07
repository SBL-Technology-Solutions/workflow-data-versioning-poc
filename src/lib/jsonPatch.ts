import pkg, { type Operation } from "fast-json-patch";

const { compare } = pkg;

/**
 * Generates a JSON Patch representing the differences between two objects with string keys and values.
 *
 * @param oldObj - The original object to compare
 * @param newObj - The updated object to compare
 * @returns An array of JSON Patch operations describing changes from `oldObj` to `newObj`
 */
export function createJSONPatch(
	oldObj: Record<string, string>,
	newObj: Record<string, string>,
) {
	return compare(oldObj, newObj);
}

export type JSONPatch = Operation[];
