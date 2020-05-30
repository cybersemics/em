import { Path, Context, Child } from "../types";

type ReturnType = {
  (param:Context): string;
  (param:Path): Child;
  (param: Path | Context) : string | Child
}
/** Gets the signifying label of the given context. */
export const head: ReturnType = (thoughts: any) => thoughts[thoughts.length - 1]
