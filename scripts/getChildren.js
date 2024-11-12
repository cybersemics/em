/** Reads the children of a context and outputs them to the CLI. */

const fs = require('fs')
const path = require('path')
const getChildrenByContext = require('./lib/getChildrenByContext')

const [, , file, ...context] = process.argv
if (!file) {
  console.error('Usage: node [SCRIPT] db.json a/b/c')
  process.exit(1)
}

const { thoughtIndex, lexemeIndex } = JSON.parse(fs.readFileSync(file, 'utf8'))

const children = getChildrenByContext({ thoughtIndex }, thoughtIndex.__ROOT__, context)
const values = children.map(child => `${child.id} ${child.value} (${Object.keys(child.childrenMap).length})`)
if (context.length > 0) {
  console.log(context.join('/'))
}
console.log(values.map(value => (context.length > 0 ? '  ' : '') + value).join('\n'))
