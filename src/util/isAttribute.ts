/** Returns true if the given value starts `=`, indicating a metaprogramming attribute i.e =view, =note etc while also considering spaces and word characters. */
const isAttribute = (s: string) => /^=\w+$/.test(s)

export default isAttribute
