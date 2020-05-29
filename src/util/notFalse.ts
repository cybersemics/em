import { GenericObject } from "../utilTypes";

/** Returns a shallow copy of an object with all keys that do not have a falsey value. */
export const notFalse = (o: GenericObject) => Object.keys(o).reduce((acc, key) => (o[key] ? {...acc, [key]: o[key]} : acc), {})