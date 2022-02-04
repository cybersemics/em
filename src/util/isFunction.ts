/** Returns true if the given value starts `=`, indicating a metaprogramming attribute i.e =view, =note etc while also considering spaces and word characters. */
export const isFunction = (s: string) => !!s.match(/^=[A-Za-z]+$/g)
