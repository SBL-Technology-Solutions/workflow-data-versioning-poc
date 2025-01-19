import { compare } from "fast-json-patch";

export function createJSONPatch(oldObj: any, newObj: any) {
  return compare(oldObj, newObj);
}
