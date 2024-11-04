/** Converts a database of schema v8 to plain text. Sorts children by rank. Ignores created, lastUpdated, and all Lexemes.
 * Usage: node schema8-to-text.js /Users/raine/Documents/Backups/em/schema-v8/2023-02-05.json > /Users/raine/Documents/Backups/em/schema-v8/2023-02-05.txt
 */
import fs from 'fs'

/** Repeats a string n times. */
const repeat = (s, n) => new Array(n).fill(s).join('')

/** Compares the rank of two thoughts for sorting purposes. */
const compareByRank = (a, b) => (a.rank > b.rank ? 1 : a.rank < b.rank ? -1 : 0)

const path = process.argv[2]
if (!path) {
  console.info('Please specify a path.')
  process.exit(1)
}

const input = fs.readFileSync(path, 'utf-8')
const state = JSON.parse(input)
const root = state.thoughtIndex.__ROOT__

const traverse = (thought, { indent = 0 } = {}) => {
  const isRoot = thought.id === '__ROOT__'
  if (!isRoot) {
    console.info(`${repeat(' ', indent)}- ${thought.value}`)
  }
  const children = Object.keys(thought.children || {}).map(
    childId => state.thoughtIndex[childId] || thought.children[childId],
  )
  children.sort(compareByRank).forEach(child => {
    if (!child) {
      console.error(`Missing child ${childId}`)
      return
    }
    traverse(child, { indent: isRoot ? 0 : indent + 2 })
  })
}

traverse(root)
