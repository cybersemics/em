/**
 * Remove root, de-indent (trim), and append newline.
 */
export const removeRoot = (exported: string) => exported.slice(exported.indexOf('\n'))
  .split('\n')
  .map(line => line.slice(2))
  .join('\n')
    + '\n'
