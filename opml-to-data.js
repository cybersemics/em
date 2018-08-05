const fs = require('fs')
const xml2json = require('xml2json')
const slugify = require('@sindresorhus/slugify')
const uuid = require('uuid/v4')

const dataRaw = fs.readFileSync('./data.opml', 'utf-8')
const data = xml2json.toJson(dataRaw, { object: true }).opml.body

const isLeaf = item => !Array.isArray(item.outline)

let i = 0
const max = 300
const slugLength = 16
const uuidLength = 8

const dataToObject = (o, start={}, lvl=0) => {

  if (i++ > max) return {}

  return o.outline.reduce((accum, item) => {
    const id = slugify(item.text).slice(0, slugLength) + '-' + uuid().slice(0, uuidLength)
    return Object.assign({},
      // accumulated keys
      accum,
      // current
      { [id]: accum[id] || {
        id,
        value: item.text,
        children: !isLeaf(item) ? item.outline.map(child => child.text) : []
      } },
      // children
      !isLeaf(item) ? dataToObject(item, accum, lvl + 1) : {}
    )
  }, start)
}

const obj = dataToObject(data)
const objWithRoot = Object.assign({}, obj, {
  root: {
    id: 'root',
    value: '',
    parents: [],
    children: data.outline.map(child => child.text)
  }
})

console.log('export default ' + JSON.stringify(objWithRoot, null, 2))
