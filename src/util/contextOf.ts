import { Context } from "../types";

/** Gets the context of a context. */
export const contextOf = (context: Context): Context => context.slice(0, -1)
