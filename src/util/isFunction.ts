/** Returns true if the given value starts `=`, indicating a metaprogramming attribute. */
export const isFunction = (s: string) => s.startsWith('=')
