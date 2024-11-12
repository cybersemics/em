import fs from 'fs'
import _ from 'lodash'
import path from 'path'
import Context from '../../src/@types/Context'
import Index from '../../src/@types/Index'
import Parent from '../../src/@types/Parent'
import State from '../../src/@types/State'
import hashContext from '../../src/util/hashContext'
import hashThought from '../../src/util/hashThought'

const helpText = `Usage: npm run start -- [subcommand] em-proto-m93daff2.json

Subcommands: contexts, thoughts, format

Outputs to a file with a ".[subcommand]" suffix.
`

type ParentOld = Parent & {
  context?: Context
}

interface RemoteState {
  lexemeIndex: State['thoughts']['lexemeIndex']
  thoughtIndex: State['thoughts']['thoughtIndex']
}

const subcommands = {
  contexts: (state: RemoteState) => {
    // convert
    let stateNew = null
    let converted = 0
    let missing = 0

    const thoughtIndexNew = _.transform(
      state.thoughtIndex,
      (accum, parent: ParentOld, contextEncoded) => {
        // missing context is from legacy data and is presumed to already be unreachable
        if (!parent.context) {
          accum[contextEncoded] = parent
          missing++
          return
        }

        const contextEncodedNew = hashContext(parent.context!)
        accum[contextEncodedNew] = parent
        converted++
      },
      {} as Index<Parent>,
    )

    console.log(`Converted: ${converted}`)
    console.log(`Missing contexts: ${missing}`)

    return {
      ...state,
      thoughtIndex: thoughtIndexNew,
    }
  },

  format: x => x,

  thoughts: () => {
    console.error('Not yet implemented')
    process.exit(1)
  },
} as Index<(state: RemoteState) => any>

const main = () => {
  const [, , subcommand, inputPath] = process.argv

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
