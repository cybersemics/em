import { Path } from "../types";

/** Gets the signifying label of the given context. */
export const head = (thoughts: Path) => thoughts[thoughts.length - 1]
