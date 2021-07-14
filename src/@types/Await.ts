// type to unpack a Promise
export type Await<T> = T extends PromiseLike<infer U> ? U : T
