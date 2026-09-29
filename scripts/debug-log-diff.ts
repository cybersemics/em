/**
 * Compares a debug log a reporter attached to an issue against one captured while reproducing it, and prints
 * where the two runs stopped behaving the same way.
 *
 * ```sh
 * npx tsx scripts/debug-log-diff.ts /tmp/em-debug-log-reported.txt /tmp/em-debug-log-local.txt
 * ```
 *
 * The report is bounded, so neither log's size reaches the reader: a few steps of editing already produce
 * thousands of characters, and a full buffer is close to a megabyte. See docs/debug-log.md.
 */
import { parseArgs } from 'node:util'
import debugLogCompare from './debugLogCompare'

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    anchor: { type: 'string' },
    'no-anchor': { type: 'boolean' },
    tail: { type: 'string' },
    ignore: { type: 'string' },
    include: { type: 'string' },
    mask: { type: 'string' },
    context: { type: 'string' },
    'max-lines': { type: 'string' },
  },
})

if (positionals.length !== 2) {
  console.error(
    [
      'Usage: npx tsx scripts/debug-log-diff.ts <reported.txt> <local.txt> [options]',
      '',
      '  --anchor <type>    Compare from the last entry of this type in each log. Default: session.',
      '  --no-anchor        Compare both logs from the top.',
      '  --tail <n>         Compare only the last n entries of each log.',
      `  --ignore <types>   Drop these comma-separated entry types. Default: ${debugLogCompare.DEFAULT_IGNORE.join(',')}.`,
      '  --include <types>  Keep these types even though they are dropped by default.',
      '  --mask <fields>    Also mask these comma-separated JSON field names before comparing.',
      '  --context <n>      Entries of matching context to show before the divergence. Default: 8.',
      '  --max-lines <n>    Most alignment steps to print from the divergence on. Default: 60.',
    ].join('\n'),
  )
  process.exit(2)
}

/** Splits a comma-separated option into a list, tolerating spaces and empty segments. */
const list = (value: string | undefined): string[] =>
  (value ?? '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)

const included = list(values.include)
const [theirsPath, minePath] = positionals

const comparison = debugLogCompare.compare(debugLogCompare.read(theirsPath), debugLogCompare.read(minePath), {
  anchor: values['no-anchor'] ? null : (values.anchor ?? 'session'),
  tail: values.tail ? Number(values.tail) : null,
  ignore: [...(values.ignore ? list(values.ignore) : debugLogCompare.DEFAULT_IGNORE)].filter(
    type => !included.includes(type),
  ),
  mask: list(values.mask),
})

console.info(
  debugLogCompare.render(comparison, {
    context: values.context ? Number(values.context) : 8,
    maxLines: values['max-lines'] ? Number(values['max-lines']) : 60,
  }),
)

// An empty log on either side means the capture or the download did not produce what was expected, which is
// worth failing on rather than reporting as "no divergence".
if (comparison.theirs.entries.length === 0 || comparison.mine.entries.length === 0) {
  console.error('\nOne of the logs contained no entries. Check that both files are em debug logs.')
  process.exit(1)
}
