/** Strips HTML-looking tags from the given string. */
const stripTags = (s: string) =>
  s
    .split('')
    .reduce(
      (accum, char) =>
        char === '<'
          ? { ...accum, inTag: true }
          : char === '>' && accum.inTag
            ? { ...accum, inTag: false }
            : accum.inTag
              ? accum
              : { ...accum, value: accum.value + char },
      { inTag: false, value: '' },
    ).value

export default stripTags
