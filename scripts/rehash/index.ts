import fs from 'fs'
import path from 'path'
import _ from 'lodash'
import { hashContext, hashThought } from '../../src/util'
import { State } from '../../src/util/initialState'
import { Context, Index, Parent } from '../../src/types'

interface RemoteDataSchema {
  thoughtIndex: State['thoughts']['thoughtIndex'],
  contextIndex: State['thoughts']['contextIndex'],
}

const main = () => {

  const [,,subcommand, inputPath] = process.argv

  // check args
  if (process.argv.length <= 2) {
    console.info('Usage:\n')
    console.info('  npm run start -- contexts input.json')
    console.info('  npm run start -- thoughts input.json')
    console.info('')
    process.exit(0)
  }

  if (!inputPath) {
    console.error('Please specify a JSON data file. You can export it from /users/USER_ID in Firebase.')
    process.exit(1)
  }

  // read
  console.info('Reading ' + inputPath)
  const input = fs.readFileSync(inputPath, 'utf-8')
  const state = JSON.parse(input) as RemoteDataSchema

  // convert
  let stateNew = null
  let converted = 0
  let missing = 0

  if (subcommand === 'contexts') {
    const contextIndexNew = _.transform(state.contextIndex, (accum, parent, contextEncoded) => {

      // missing context is from legacy data and is presumed to already be unreachable
      if (!parent.context) {
        missing++
        return
      }

      const contextEncodedNew = hashContext(parent.context)
      accum[contextEncodedNew] = parent
      converted++

    }, {} as Index<Parent>)

    stateNew = {
      ...state,
      contextIndex: contextIndexNew
    }

    console.log(`Converted: ${converted}`)
    console.log(`Missing contexts: ${missing}`)
  }
  else if (subcommand === 'thoughts') {
    console.error('Not yet implemented')
    process.exit(1)
  }
  else {
    console.error(`Unrecognized subcommand: ${subcommand}`)
    process.exit(1)
  }

  // write
  const ext = path.extname(inputPath)
  const outputPath = inputPath.replace(ext, '') + '.rehashed' + ext
  console.info('Writing ' + outputPath)
  fs.writeFileSync(outputPath, JSON.stringify(stateNew, null, 2))
}

main()
