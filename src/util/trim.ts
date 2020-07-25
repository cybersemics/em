/** Trims a string. */
export const trim = (s: string) => s.replace(
  s.length > 0 && s.replace(/\W/g, '').length > 0 ? /\W/g : /s/g,
  ''
)
