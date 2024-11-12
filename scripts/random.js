/** Repeats a string n times. */
const repeat = (s, n) => new Array(n).fill(s).join('')

/** Randomly returns -1, 0, or 1. */
const randUpDown = () => Math.floor(Math.random() * 3) - 1

/** Randomly returns 0, or 1. */
const randUp = () => Math.floor(Math.random() * 2)

// parse arguments
if (process.argv.length < 3) {
  console.error(`Usage:

  node random.js 100
`)
  process.exit(1)
}
const n = parseInt(process.argv[2], 10)

if (isNaN(n)) {
  console.error('NaN')
  process.exit(1)
}

let indentationLevel = 0

// print random thoughts
for (let i = 0; i < n; i++) {
  const indent = repeat('  ', indentationLevel)
  const line = `${indent}- ${i.toString(16)}`
  console.log(line)

  indentationLevel += indentationLevel === 0 ? randUp() : randUpDown()
}
