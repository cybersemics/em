/** Deletes all root children that have no children. */

const fs = require('fs')
const path = require('path')
const getChildrenByContext = require('./lib/getChildrenByContext')
const deleteThought = require('./lib/deleteThought')

const [, , file, ...context] = process.argv
if (!file) {
  console.error('Usage: node [SCRIPT] db.json')
  process.exit(1)
}

const thoughtIndices = JSON.parse(fs.readFileSync(file, 'utf8'))
const { thoughtIndex, lexemeIndex } = thoughtIndices

const rootChildren = getChildrenByContext(thoughtIndex, thoughtIndex.__ROOT__, context)

// delete all leaves in the root
rootChildren.forEach(rootChild => {
  const numChildren = Object.keys(rootChild.childrenMap).length
  if (numChildren === 0 && rootChild.value !== '—-') {
    deleteThought(thoughtIndices, rootChild)
  }
})

fs.writeFileSync(file, JSON.stringify(thoughtIndices, null, 2))
