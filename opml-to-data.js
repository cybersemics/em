const fs = require('fs')
const xml2json = require('xml2json')

const dataRaw = fs.readFileSync('./data.opml', 'utf-8')
const data = xml2json.toJson(dataRaw, { object: true }).opml.body

const isLeaf = item => !Array.isArray(item.outline)

let i = 0
const max = 1000

const dataToObject = (o, start={}, lvl=0) => {

  if (i++ > max) return {}

  return o.outline.reduce((accum, item) => {
    return Object.assign({},
      // accumulated keys
      accum,
      // current
      { [item.text]: accum[item.text] ? { /* TODO */ } : {
        id: item.text,
        value: item.text,
        parents: [],
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
