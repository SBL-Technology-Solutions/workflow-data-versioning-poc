import pkg from "fast-json-patch";
const { compare } = pkg;

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function createJSONPatch(oldObj: any, newObj: any) {
	return compare(oldObj, newObj);
}
