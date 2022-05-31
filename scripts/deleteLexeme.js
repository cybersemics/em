/** Deletes a Lexeme and all its thoughts. Must be given a normalized Lexeme value. */

const fs = require('fs')
const path = require('path')
const contextToThought = require('./lib/contextToThought')
const deleteThought = require('./lib/deleteThought')
const hashThought = require('./lib/hashThought')

const [, , file, value] = process.argv
if (!file || !value) {
  console.error(`Usage: node [SCRIPT] db.json '=archive'`)
  process.exit(1)
}

const thoughtIndices = JSON.parse(fs.readFileSync(file, 'utf8'))
const { thoughtIndex, lexemeIndex } = thoughtIndices

const key = hashThought(value)
const lexeme = lexemeIndex[key]
if (!lexeme) {
  throw new Error('Lexeme not found')
}

// iterate through each Lexeme context
// use a while loop since lexeme.contexts is changed each iteration
while (lexeme.contexts.length > 0) {
  const id = lexeme.contexts[0]
  const thought = thoughtIndex[id]

  if (!thought) {
    console.error('lexeme', lexeme)
    throw new Error(`Thought not found in Lexeme context thought ${id}`)
  }

  deleteThought(thoughtIndices, thought)
}

fs.writeFileSync(file, JSON.stringify(thoughtIndices, null, 2))
