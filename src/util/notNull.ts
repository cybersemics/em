import { GenericObject } from "../utilTypes";

//@ts-nocheck

/** Returns a shallow copy of an object with all keys that do not have a value of null or undefined. */
export const notNull = (o: GenericObject) => Object.keys(o).reduce((acc, key) => (o[key]!==null ? {...acc, [key]: o[key]} : acc), {})