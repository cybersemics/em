/**
 * Remove root, de-indent (trim), and append newline to make tests cleaner.
 */
export const removeRoot = exported => exported.slice(exported.indexOf('\n'))
  .split('\n')
  .map(line => line.slice(2))
  .join('\n')
    + '\n'
