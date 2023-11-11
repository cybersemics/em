const stdin = process.openStdin()
const spawn = require('child_process').spawn

/**
 * Read config data from stdin.
 */
const readInput = () =>
  new Promise(resolve => {
    stdin.addListener('data', data => resolve(data.toString().trim()))
  })

/**
 * Check if  given value is an object.
 */
function isObject(x) {
  return x !== null && typeof x === 'object'
}

/**
 * Generate key value pair from given object.
 */
const parse = tree =>
  Object.keys(tree).reduce(
    (acc, key) => [
      ...acc,
      ...(isObject(tree[key]) ? parse(tree[key]).map(child => `${key}.${child}`) : [`${key}="${tree[key]}"`]),
    ],
    [],
  )

/**
 * Run firebase config set.
 */
function runFirebaseConfigSet(keyValues) {
  return new Promise((resolve, reject) => {
    const args = ['functions:config:set'].concat(keyValues)
    const cmd = spawn('firebase', args, { shell: true })
    cmd.stdout.setEncoding('utf8')
    cmd.stderr.on('data', data => {
      console.log('error:', cmd.stderr.toString())
    })
    cmd.stdout.on('data', data => {
      console.log(data)
    })
    cmd.on('close', code => {
      console.log(`exit code: ${code}`)
      resolve(code)
    })
  })
}
/**
 * Script to set firebase config from json.
 */
const initScript = async () => {
  const stdinInput = await readInput()
  const json = JSON.parse(stdinInput)
  const keyValues = parse(json)
  // console.log('Configuration keys \n', keyValues.map(it => '\t▸ ' + it).join('\n'))
  await runFirebaseConfigSet(keyValues)
}

initScript()
