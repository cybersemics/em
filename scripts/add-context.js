/** Traverses the thoughtIndex of a JSON file exported from Firebase and adds missing contexts. */

const fs = require('fs')
const path = require('path')
const murmurHash3 = require('murmurhash3js')

const EM_TOKEN = '__EM__'
const HOME_TOKEN = '__ROOT__'
const SEPARATOR_TOKEN = '__SEP__'
const appendContext = (context, child) => unroot([...context, child])
const escapeRegEx = s => s.replace(/[-[\]{}()*+?.\\^$|#\s]/g, '\\$&')
const escapeSelector = s => '_' + s.replace(regexEscapeSelector, s => `_${s.charCodeAt(0)}`)
const regexEscapeSelector = new RegExp('[' + escapeRegEx(' !"#$%&\'()*+,./:;<=>?@[]^`{|}~') + ']', 'g')
const unroot = context => (context[0] === HOME_TOKEN ? context.slice(1) : context)

/** Encode the thoughts (and optionally rank) as a string. */
const hashContext = (thoughts, rank) =>
  murmurHash3.x64.hash128(
    thoughts.map(thought => (thought ? escapeSelector(thought) : '')).join(SEPARATOR_TOKEN) +
      (typeof rank === 'number' ? SEPARATOR_TOKEN + rank : ''),
  )

/** Traverses the thoughtIndex, calling a function for each context. */
const traverseContext = (state, context, f) => {
  const parent = state.thoughtIndex[hashContext(context)]
  if (parent) {
    f(context, parent)
    ;(parent.children || []).forEach(child => traverseContext(state, appendContext(context, child.value), f))
  }
}

const setContext = (context, parent) => {
  if (!parent.context) {
    parent.context = context
  }
}

const cli = () => {
  const [, , inputPath] = process.argv

  if (!inputPath) {
    console.error('ERROR: input json path required')
    process.exit(1)
  }

  console.info('Reading ' + inputPath)
  const input = fs.readFileSync(inputPath, 'utf-8')
  const state = JSON.parse(input)
  traverseContext(state, [HOME_TOKEN], setContext)
  traverseContext(state, [EM_TOKEN], setContext)
  const ext = path.extname(inputPath)
  const outputPath = inputPath.replace(ext, '') + '-with-contexts' + ext
  console.info('Writing ' + outputPath)
  fs.writeFileSync(outputPath, JSON.stringify(state, null, 2))
  console.info('Done')
}

cli()
