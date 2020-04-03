/* A thought with a specific rank */
export interface Child {
  rank: number,
  value: string,
}

/* A sequence of children with ranks */
export type Path = Array<Child>

/* A sequence of values */
export type Context = Array<string>
