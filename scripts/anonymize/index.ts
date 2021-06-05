// mock browser globals for page-lifecycle
global.addEventListener = () => {}
global.self = {} as any
global.document = { hasFocus: () => false } as any

import fs from 'fs'
import _ from 'lodash'
import * as murmurHash3 from 'murmurhash3js'
import { hashContext, hashThought, timestamp } from '../../src/util'
import { Child, Context, Index, Lexeme, Parent } from '../../src/types'

// arrays are stored as objects with a numeric index in Firebase
// so we have to override array types
// (we could also convert the Firebase State to a proper State instead)
type FirebaseContext = Index<string>
type FirebaseLexeme = { contexts: Index<FirebaseThoughtContext>, value: string }
type FirebaseParent = { children: Index<Child>, context: FirebaseContext }
type FirebaseThoughtContext = { id?: string, context: FirebaseContext, rank: number }

interface Database {
  users: Index<UserState>
}

interface UserState {
  thoughtIndex: Index<FirebaseLexeme>,
  contextIndex: Index<FirebaseParent>,
  recentlyEdited: unknown,
}

interface Options {

  // runs without writing to disk
  dry?: boolean,

  // prints additional information
  verbose?: boolean,
}

const userId = 'm9S244ovF7fVrwpAoqoWxcz08s52'

const helpText = `Usage:

  node build/scripts/anonymize/index.js em-proto-db.json
`

let limit = Infinity

const salt = timestamp()
const anonymizeString = (value: string) => murmurHash3.x64.hash128(salt + value).slice(0, 8)

const anonymize = {

  contextIndex: (contextIndex: Index<FirebaseParent>) => {

    // anonymize contextIndex
    const parentEntries = Object.entries(contextIndex)
    parentEntries.forEach(([id, parent]) => {
      if (limit-- <= 0) {
        console.error('Limit reached')
        process.exit(1)
      }

      // context
      const contextNew = Object.values(parent.context).map(anonymizeString)
      parent.context = contextNew as unknown as FirebaseContext

      // children
      parent.children = Object.values(parent.children).map(child => ({
        ...child,
        value: anonymizeString(child.value),
      })) as unknown as Index<Child>

      // context hash
      const idNew = hashContext(contextNew)
      contextIndex[idNew] = parent
      delete contextIndex[id]

    })

  },

  thoughtIndex: (thoughtIndex: Index<FirebaseLexeme>) => {

    // anonymize thoughtIndex
    const lexemeEntries = Object.entries(thoughtIndex)
    lexemeEntries.forEach(([id, lexeme]) => {
      if (limit-- <= 0) {
        console.error('Limit reached')
        process.exit(1)
      }

      lexeme.value = anonymizeString(lexeme.value)
      lexeme.contexts = Object.values(lexeme.contexts).map(cx => ({
        ...cx,
        context: Object.values(cx.context).map(anonymizeString)
      })) as unknown as Index<FirebaseThoughtContext>

      // value hash
      const idNew = hashThought(lexeme.value)
      thoughtIndex[idNew] = lexeme
      delete thoughtIndex[id]

    })

  },

}

/** Anonymizes all thoughts and user information in user state. Preserves ranks, lastUpdated, and shape. */
const anonymizeState = (state: UserState, options: Options = {}) => {

  anonymize.contextIndex(state.contextIndex)
  anonymize.thoughtIndex(state.thoughtIndex)

  return _.pick(state, ['contextIndex', 'thoughtIndex', 'lastUpdated'])
}

/*****************************************************************
 * MAIN
 *****************************************************************/
const main = () => {

  // validate
  if (process.argv.length < 3) {
    console.info(helpText)
    process.exit(0)
  }

  // parse args
  const [,,fileIn] = process.argv
  const options: Options = process.argv.slice(2).reduce<Index<boolean>>((accum, arg) => ({
    ...accum,
    ...arg.startsWith('--') ? { [arg.slice(2)]: true } : null,
  }), {})

  // read
  const input = fs.readFileSync(fileIn, 'utf-8')
  const db = JSON.parse(input) as Database | UserState
  const state = (db as Database).users?.[userId] || db as UserState

  anonymizeState(state, options)

  console.log('')
  console.log('Parents:', Object.values(state.contextIndex).length)
  console.log('Lexemes:', Object.values(state.thoughtIndex).length)
  console.log('')

  // write
  const fileOut = `${fileIn.slice(0, -'.json'.length)}.anonymized.json`

  if (options.dry) {
    console.log('Done')
  }
  else
  {
    fs.writeFileSync(fileOut, JSON.stringify(state, null, 2))
    console.log(`Output state written to: ${fileOut}`)
  }

}

main()
