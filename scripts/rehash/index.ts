import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import { hashContext, hashThought } from '../../src/util'
import { State } from '../../src/util/initialState'
import { Context, Index, Parent } from '../../src/types'

const helpText = `Usage: npm run start -- [subcommand] em-proto-m93daff2.json

Subcommands: contexts, thoughts, format

Outputs to a file with a ".[subcommand]" suffix.
`

interface RemoteState {
  thoughtIndex: State['thoughts']['thoughtIndex'],
  contextIndex: State['thoughts']['contextIndex'],
}

const subcommands = {

  contexts: (state: RemoteState) => {

    // convert
    let stateNew = null
    let converted = 0
    let missing = 0

    const contextIndexNew = _.transform(state.contextIndex, (accum, parent, contextEncoded) => {

      // missing context is from legacy data and is presumed to already be unreachable
      if (!parent.context) {
        accum[contextEncoded] = parent
        missing++
        return
      }

      const contextEncodedNew = hashContext(parent.context)
      accum[contextEncodedNew] = parent
      converted++

    }, {} as Index<Parent>)

    console.log(`Converted: ${converted}`)
    console.log(`Missing contexts: ${missing}`)

    return {
      ...state,
      contextIndex: contextIndexNew
    }
  },

  format: x => x,

  thoughts: () => {
    console.error('Not yet implemented')
    process.exit(1)
  },

} as Index<(state: RemoteState) => any>

const main = () => {

  const [,,subcommand, inputPath] = process.argv

  // check args
  if (process.argv.length <= 2) {
    console.info(helpText)
    process.exit(0)
  }

  if (!inputPath) {
    console.error('Please specify a JSON data file. You can export it from /users/USER_ID in Firebase.')
    process.exit(1)
  }

  // read
  console.info('Reading ' + inputPath)
  const input = fs.readFileSync(inputPath, 'utf-8')
  const state = JSON.parse(input) as RemoteState

  // transform
  const stateNew = subcommands[subcommand](state)

  // write
  const ext = path.extname(inputPath)
  const outputPath = `${inputPath.replace(ext, '')}.${subcommand}${ext}`
  console.info('Writing ' + outputPath)
  fs.writeFileSync(outputPath, JSON.stringify(stateNew, null, 2))
}

main()
