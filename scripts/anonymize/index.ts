// mock browser globals for page-lifecycle
global.addEventListener = () => {}
global.self = {} as any
global.document = { hasFocus: () => false } as any

import fs from 'fs'
import _ from 'lodash'
import * as murmurHash3 from 'murmurhash3js'
import { EM_TOKEN, HOME_TOKEN } from '../../src/constants'
import { hashContext, hashThought, isEM, isRoot, normalizeThought, timestamp } from '../../src/util'
import { Child, Context, Index, Lexeme, Parent } from '../../src/@types'

// arrays are stored as objects with a numeric index in Firebase
// so we have to override array types
// (we could also convert the Firebase State to a proper State instead)
type FirebaseContext = Index<string>
type FirebaseLexeme = { contexts: Index<FirebaseThoughtContext>; value: string }
type FirebaseParent = { children: Index<Child>; context: FirebaseContext }
type FirebaseThoughtContext = { id?: string; context: FirebaseContext; rank: number }

interface Database {
  users: Index<UserState>
}

interface UserState {
  lexemeIndex: Index<FirebaseLexeme>
  contextIndex: Index<FirebaseParent>
  recentlyEdited: unknown
}

interface Options {
  // runs without writing to disk
  dry?: boolean

  // prints additional information
  verbose?: boolean
}

const userId = 'm9S244ovF7fVrwpAoqoWxcz08s52'

const helpText = `Usage:

  node build/scripts/anonymize/index.js em-proto-db.json
`

let limit = Infinity

const salt = timestamp()

/** Anonymizes a context. */
const anonymizeContext = (context: FirebaseContext): string[] => Object.values(context || {}).map(anonymizeValue)

/** Anonynmizes a string value. Ignores root. */
const anonymizeValue = (value: string): string => {
  const anon =
    value === HOME_TOKEN || value === EM_TOKEN
      ? value
      : value + '-' + murmurHash3.x64.hash128(salt + normalizeThought(value)).slice(0, 8)
  return anon
}

const anonymize = {
  contextIndex: (contextIndex: Index<FirebaseParent>) => {
    const parentEntries = Object.entries(contextIndex)
    parentEntries.forEach(([id, parent]) => {
      if (limit-- <= 0) {
        console.error('Limit reached')
        process.exit(1)
      }

      // context
      const parentIsRoot = isRoot(Object.values(parent.context || {})) || isEM(Object.values(parent.context || {}))
      const contextNew = anonymizeContext(parent.context)
      parent.context = contextNew as unknown as FirebaseContext

      // children
      parent.children = Object.values(parent.children).map(child => ({
        ...child,
        value: anonymizeValue(child.value),
      })) as unknown as Index<Child>

      // context hash
      // TODO:
      //   One and Ones have the same hash.
      //   After being anonymized, they do not.
      if (!parentIsRoot) {
        const idNew = hashContext(contextNew)
        contextIndex[idNew] = parent
        delete contextIndex[id]
      }
    })
  },

  lexemeIndex: (lexemeIndex: Index<FirebaseLexeme>) => {
    const lexemeEntries = Object.entries(lexemeIndex)
    lexemeEntries.forEach(([id, lexeme]) => {
      if (limit-- <= 0) {
        console.error('Limit reached')
        process.exit(1)
      }

      const lexemeIsRoot = isRoot([lexeme.value]) || isEM([lexeme.value])
      lexeme.value = anonymizeValue(lexeme.value)
      lexeme.contexts = Object.values(lexeme.contexts || {}).map(cx => ({
        ...cx,
        context: anonymizeContext(cx.context),
      })) as unknown as Index<FirebaseThoughtContext>

      // value hash
      // TODO:
      //   One and Ones have the same hash.
      //   After being anonymized, they do not.
      if (!lexemeIsRoot) {
        const idNew = hashThought(lexeme.value)
        lexemeIndex[idNew] = lexeme
        delete lexemeIndex[id]
      }
    })
  },
}

/** Anonymizes all thoughts and user information in user state. Preserves ranks, lastUpdated, and shape. */
const anonymizeState = (state: UserState, options: Options = {}) => {
  anonymize.contextIndex(state.contextIndex)
  anonymize.lexemeIndex(state.lexemeIndex)

  return _.pick(state, ['contextIndex', 'lexemeIndex', 'lastUpdated']) as UserState
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
  const [, , fileIn] = process.argv
  const options: Options = process.argv.slice(2).reduce<Index<boolean>>(
    (accum, arg) => ({
      ...accum,
      ...(arg.startsWith('--') ? { [arg.slice(2)]: true } : null),
    }),
    {},
  )

  // read
  const input = fs.readFileSync(fileIn, 'utf-8')
  const db = JSON.parse(input) as Database | UserState
  const state = (db as Database).users?.[userId] || (db as UserState)

  const stateNew = anonymizeState(state, options)

  console.log('')
  console.log('Parents:', Object.values(stateNew.contextIndex).length)
  console.log('Lexemes:', Object.values(stateNew.lexemeIndex).length)
  console.log('')

  // write
  const fileOut = `${fileIn.slice(0, -'.json'.length)}.anonymized.json`

  if (options.dry) {
    console.log('Done')
  } else {
    fs.writeFileSync(fileOut, JSON.stringify(stateNew, null, 2))
    console.log(`Output state written to: ${fileOut}`)
  }
}

main()
