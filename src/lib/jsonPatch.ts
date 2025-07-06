import pkg from "fast-json-patch";

const { compare } = pkg;

export function createJSONPatch(
	oldObj: Record<string, string>,
	newObj: Record<string, string>,
) {
	return compare(oldObj, newObj);
}
