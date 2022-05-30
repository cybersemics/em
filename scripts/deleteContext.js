/** Deletes a thought with a given context. */

const fs = require('fs')
const path = require('path')
const contextToThought = require('./lib/contextToThought')
const deleteThought = require('./lib/deleteThought')

const [, , file, ...context] = process.argv
if (!file || context.length === 0) {
  console.error('Usage: node [SCRIPT] db.json a/b/c')
  process.exit(1)
}

const thoughtIndices = JSON.parse(fs.readFileSync(file, 'utf8'))
const { thoughtIndex, lexemeIndex } = thoughtIndices

const thought = contextToThought(thoughtIndices, thoughtIndex.__ROOT__, context)
if (!thought) {
  console.error(`${context} not found`)
  process.exit(1)
}
deleteThought(thoughtIndices, thought)

fs.writeFileSync(file, JSON.stringify(thoughtIndices, null, 2))
