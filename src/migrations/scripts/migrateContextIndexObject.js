const fs = require('fs')
const _ = require('lodash')

const prettyPrint = false

/**
 * Converts contextIndex array into { children, lastUpdated } object.
 * Manually migrates data exported from Firebase.
 * See: https://github.com/cybersemics/em/pull/722/.
 */
const migrate = data => ({
  users: _.mapValues(data.users, userData => ({
    ...userData,
    contextIndex: _.mapValues(userData.contextIndex, children => children.children
      // already migrated
      ? children
      // need to be migrated
      : {
        children,
        // set lastUpdated to newest child lastUpdated
        lastUpdated: children.reduce(
          (accum, child) => child.lastUpdated > accum ? child.lastUpdated : accum,
          '' // any time stamp will evaluate to newer than empty string
        )
      })
  }))
})

/**
 *
 */
const run = () => {
  const path = process.argv[2]

  if (!path) {
    console.error('Usage: node migrateContextIndexObject.js firebase-data.json')
    process.exit(1)
  }

  console.info(`Reading ${path}...`)
  const input = fs.readFileSync(path, 'utf-8')

  console.info('Parsing JSON...')
  const data = JSON.parse(input)

  console.info('Migrating...')
  const migrated = migrate(data)

  console.info('Writing migrated data...')
  fs.writeFileSync('output.json', JSON.stringify(migrated, ...prettyPrint ? [null, 2] : []))

  console.info('Done')
}

run()
