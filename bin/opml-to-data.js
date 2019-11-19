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
const dataFile = process.argv[2] || './data.opml'
const SEP = '|SEPARATOR_TOKEN|'

/**************************************************************
 * Helpers
 **************************************************************/

/*
// create an id unique to the item's value and its ancestors
const idAncestry = (item, ancestors) => slugify(item.text).slice(0, slugLength) + '-' + md5(item.text + SEP + ancestors.join(SEP)).slice(0, hashLength)
*/

// create an id unique to the item's value
// const idValue = item => slugify(item.text).slice(0, slugLength) + '-' + md5(slugify(item.text)).slice(0, hashLength)
const idValue = item => item.text

// item.outline may be an array or an object if the item has a single child so it must be normalied to an array
const children = item => item.outline ? [].concat(item.outline) : []

const isLeaf = item => children(item).length === 0

const unique = list => {
  const o = {}
  const out = []
  list.forEach(item => o[item] = true)
  return Object.keys(o)
}

let i = 0
const dataToObject = (startItem, initial={}, ancestors=[], lvl=0) => {

  if (i++ > maxRecursion) return {}

  return children(startItem).reduce((accum, item) => {
    const id = idValue(item)

    // Note: for some reason Object.assign will not overwrite previous items so we assign it manually
    accum[id] = {
      id,
      value: item.text,
      memberOf: ancestors.length > 0
        ? (accum[id] ? accum[id].memberOf : []).concat([ancestors])
        : []
    }

    return Object.assign({},
      // accumulated keys
      accum,
      // children
      !isLeaf(item) ? dataToObject(item, accum, ancestors.concat(id), lvl + 1) : {}
    )
  }, initial)
}

/**************************************************************
 * Main
 **************************************************************/

const dataRaw = fs.readFileSync(dataFile, 'utf-8')
const data = xml2json.toJson(dataRaw, { object: true }).opml.body

const obj = dataToObject(data)

/*
// generate root object with top-level objects as children
const objWithRoot = Object.assign({}, obj, {
  root: {
    id: 'root',
    value: '',
    children: data.outline.map(item => idValue(item, []))
  }
})
*/

// add root to top-level objects memberOf
data.outline.forEach(item => {
  obj[idValue(item)].memberOf.push(['root'])
})

obj.root = {
  id: 'root',
  memberOf: []
}

console.log('export default ' + JSON.stringify(obj, null, 2))
