/** Returns true if the given value starts `=`, indicating a metaprogramming attribute i.e =view, =note etc while also considering spaces and word characters. */
export const isAttribute = (s: string) => !!s.match(/^=\w+$/g)
