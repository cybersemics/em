const fs = require('fs')
const xml2json = require('xml2json')
const slugify = require('@sindresorhus/slugify')
const md5 = require('md5')

/**************************************************************
 * Constants
 **************************************************************/

const maxRecursion = 3000
const slugLength = 16
const hashLength = 8
const dataFile = process.argv[2] || './thoughtIndex.opml'
const SEP = '|SEPARATOR_TOKEN|'

/**************************************************************
 * Modals
 **************************************************************/

/*
// create an id unique to the thought's value and its ancestors
const idAncestry = (thought, ancestors) => slugify(thought.text).slice(0, slugLength) + '-' + md5(thought.text + SEP + ancestors.join(SEP)).slice(0, hashLength)
*/

// create an id unique to the thought's value
// const idValue = thought => slugify(thought.text).slice(0, slugLength) + '-' + md5(slugify(thought.text)).slice(0, hashLength)
const idValue = thought => thought.text

// thought.outline may be an array or an object if the thought has a single child so it must be normalied to an array
const children = thought => thought.outline ? [].concat(thought.outline) : []

const isLeaf = thought => children(thought).length === 0

const unique = list => {
  const o = {}
  const out = []
  list.forEach(thought => o[thought] = true)
  return Object.keys(o)
}

let i = 0
const dataToObject = (startThought, initial = {}, ancestors = [], lvl = 0) => {

  if (i++ > maxRecursion) return {}

  return children(startThought).reduce((accum, thought) => {
    const id = idValue(thought)

    // Note: for some reason Object.assign will not overwrite previous thoughts so we assign it manually
    accum[id] = {
      id,
      value: thought.text,
      memberOf: ancestors.length > 0
        ? (accum[id] ? accum[id].memberOf : []).concat([ancestors])
        : []
    }

    return Object.assign({},
      // accumulated keys
      accum,
      // children
      !isLeaf(thought) ? dataToObject(thought, accum, ancestors.concat(id), lvl + 1) : {}
    )
  }, initial)
}

/**************************************************************
 * Main
 **************************************************************/

const dataRaw = fs.readFileSync(dataFile, 'utf-8')
const thoughtIndex = xml2json.toJson(dataRaw, { object: true }).opml.body

const obj = dataToObject(thoughtIndex)

/*
// generate root object with top-level objects as children
const objWithRoot = Object.assign({}, obj, {
  root: {
    id: 'root',
    value: '',
    children: thoughtIndex.outline.map(thought => idValue(thought, []))
  }
})
*/

// add root to top-level objects memberOf
thoughtIndex.outline.forEach(thought => {
  obj[idValue(thought)].memberOf.push(['root'])
})

obj.root = {
  id: 'root',
  memberOf: []
}

console.log('export default ' + JSON.stringify(obj, null, 2))
