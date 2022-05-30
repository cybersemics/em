/** Deletes a Lexeme and all its thoughts. Must be given a normalized Lexeme value. */

const fs = require('fs')
const path = require('path')
const contextToThought = require('./lib/contextToThought')
const deleteThought = require('./lib/deleteThought')

const [, , file, value] = process.argv
if (!file || !value) {
  console.error(`Usage: node [SCRIPT] db.json '=archive'`)
  process.exit(1)
}

const thoughtIndices = JSON.parse(fs.readFileSync(file, 'utf8'))
const { thoughtIndex, lexemeIndex } = thoughtIndices

// iterate through all Lexemes since hashThought is not available in plain JS
let deleted = false
for (let [key, lexeme] of Object.entries(lexemeIndex)) {
  // find the lexeme with matching normalized value
  if (lexeme.value === value) {
    // iterate through each Lexeme context
    // use a while loop since lexeme.contexts is changed each iteration
    while (lexeme.contexts.length > 0) {
      console.info(lexeme.contexts.length)
      // delete each Lexeme context thought
      const id = lexeme.contexts[0]
      const thought = thoughtIndex[id]
      if (!thought) {
        // console.error('lexeme', lexeme)
        // throw new Error(`Thought not found in Lexeme context thought ${id}`)
        console.warn(`Thought missing for Lexeme "${lexeme.value}" context thought ${id}`)
      } else {
        deleteThought(thoughtIndices, thought)
        deleted = true
      }
    }
    break
  }
}

if (!deleted) {
  throw new Error(`Lexeme not found`)
}

fs.writeFileSync(file, JSON.stringify(thoughtIndices, null, 2))
