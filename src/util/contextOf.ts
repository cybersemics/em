import { Context, Path } from "../types";

type ReturnType = {
  (param:Context): Context;
  (param:Path): Path;
}

/** Gets the context of a context. */
export const contextOf: ReturnType = (context: any) => context.slice(0, -1)
