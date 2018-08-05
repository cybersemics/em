const fs = require('fs')
const xml2json = require('xml2json')
const slugify = require('@sindresorhus/slugify')
const uuid = require('uuid/v4')
const md5 = require('md5')

/**************************************************************
 * Constants
 **************************************************************/

const maxRecursion = 3000
const slugLength = 16
const hashLength = 8
const dataFile = './data.opml'
const SEP = '|SEPARATOR_TOKEN|'

/**************************************************************
 * Helpers
 **************************************************************/

// create an id unique to the item and its ancestors
const idify = (item, ancestors) => slugify(item.text).slice(0, slugLength) + '-' + md5(item.text + SEP + ancestors.join(SEP)).slice(0, hashLength)
// const idify = item => slugify(item.text).slice(0, slugLength) + '-' + uuid().slice(0, uuidLength)
// item.outline may be an array or an object if the item has a single child so it must be normalied to an array
const children = item => item.outline ? [].concat(item.outline) : []
const isLeaf = item => children(item).length === 0

let i = 0
const dataToObject = (startItem, initial={}, ancestors=[], lvl=0) => {

  if (i++ > maxRecursion) return {}

  return children(startItem).reduce((accum, item) => {
    const id = idify(item, ancestors)
    return Object.assign({},
      // accumulated keys
      accum,
      // current
      { [id]: {
        id,
        value: item.text,
        // no duplicate ids
        // children: !isLeaf(item) ? children(item).map(idify) : []
        // merge children from categories with same name
        children: children(item).map(item => idify(item, ancestors.concat(id)))
          // // non-leaf
          // ? accum[id] && accum[id].children.length > 0
          //   // category already exists
          //   ? accum[id].children.concat(children(item).map(child => '!!! ' + ancestors.join('/') + ' ' + idify(child, ancestors)))
          //   // new category
          //   : children(item).map(item => idify(item, ancestors))
          // // leaf
          // : []
      } },
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
const objWithRoot = Object.assign({}, obj, {
  root: {
    id: 'root',
    value: '',
    children: data.outline.map(item => idify(item, []))
  }
})

console.log('export default ' + JSON.stringify(objWithRoot, null, 2))
