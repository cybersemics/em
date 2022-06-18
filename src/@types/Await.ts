// type to unpack a Promise
type Await<T> = T extends PromiseLike<infer U> ? U : T

export default Await
