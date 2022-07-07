import fs from 'fs'
import _ from 'lodash'
import Child from '../../src/@types/Child'
import Context from '../../src/@types/Context'
import Index from '../../src/@types/Index'
import Lexeme from '../../src/@types/Lexeme'
import Parent from '../../src/@types/Parent'
import ThoughtContext from '../../src/@types/ThoughtContext'
import { EM_TOKEN, HOME_TOKEN } from '../../src/constants'
import hashContext from '../../src/util/hashContext'
import hashThought from '../../src/util/hashThought'
import head from '../../src/util/head'
import normalizeThought from '../../src/util/normalizeThought'
import timestamp from '../../src/util/timestamp'
import unroot from '../../src/util/unroot'

// mock browser globals for page-lifecycle
global.addEventListener = () => {}
global.self = {} as any
global.document = { hasFocus: () => false } as any

// arrays are stored as objects with a numeric index in Firebase
// so we have to override array types
// (we could also convert the Firebase State to a proper State instead)
type FirebaseContext = Index<string>
type FirebaseLexeme = { contexts: Index<FirebaseThoughtContext>; value: string }
type FirebaseParent = { children: Index<Child> }
type FirebaseThoughtContext = { id?: string; context: FirebaseContext; rank: number }

interface Database {
  users: Index<UserState>
}

interface UserState {
  lexemeIndex: Index<FirebaseLexeme>
  thoughtIndex: Index<FirebaseParent>
}

interface Options {
  // runs the repair without writing to disk
  dry?: boolean

  // prints additional information for each repair
  verbose?: boolean
}

const userId = 'm9S244ovF7fVrwpAoqoWxcz08s52'

const helpText = `Usage:

  node build/scripts/restoreChildren/index.js em-proto-db.json
`

let limit = Infinity
let missingLexemeContexts = 0
let missingThoughtContexts = 0
let missingParents = 0
let missingChildInParent = 0

// a tiny number in the order of magnitude of 0.0001 - 0.001 that ensures new children's ranks do not conflict
const smudge = () => Math.floor(Math.random() * 1000) / 1000000

// repair functions (mutates state)
const repair = {
  missingLexemeContext: (state: UserState, lexeme: FirebaseLexeme, options: Options = {}) => {
    if (lexeme.lemma === HOME_TOKEN) return

    missingLexemeContexts++

    if (options.verbose) {
      console.error(`Missing lexeme.contexts in "${lexeme.lemma}" (deleting)`)
    }

    // delete lexeme since there are no contexts to restore it to
    delete state.lexemeIndex[hashThought(lexeme.lemma)]
  },

  missingThoughtContext: (
    state: UserState,
    lexeme: FirebaseLexeme,
    cx: FirebaseThoughtContext,
    options: Options = {},
  ) => {
    // HOME and EM are expected to not have thought contexts
    if (lexeme.lemma === HOME_TOKEN || lexeme.lemma === EM_TOKEN) return

    missingThoughtContexts++

    if (options.verbose) {
      console.error(`Missing cx.context "${lexeme.lemma}" (removing from lexeme)`)
    }

    // remove ThoughtContext from lexeme since there is no context to restore it to
    lexeme.contexts = Object.values(lexeme.contexts).filter(
      thoughtContext => thoughtContext !== cx,
    ) as unknown as Index<FirebaseThoughtContext>
  },

  missingParents: (state: UserState, lexeme: FirebaseLexeme, cx: FirebaseThoughtContext, options: Options = {}) => {
    missingParents++

    // recreate the missing parent
    const context = Object.values(cx.context || {})
    const id = hashContext(context)
    const rankNew = cx.rank + smudge()
    const childNew: Child = {
      ...(cx.id ? { id: cx.id } : null),
      value: lexeme.lemma, // use Lexeme value since we the in-context value is lost
      rank: rankNew,
      lastUpdated: timestamp(),
    }
    const parentNew: Parent = {
      id,
      children: [childNew],
      context,
      lastUpdated: timestamp(),
    }
    // arrays can be safely saved to Firebase
    state.thoughtIndex[id] = parentNew as unknown as FirebaseParent
    cx.rank = rankNew

    if (options.verbose) {
      const msg = `{ value: "${lexeme.lemma}", rank: ${cx.rank} } appears in ThoughtContext "${cx.context}" but no Parent exists.`
      console.error(msg)
      console.error('parentNew', parentNew)
    }
  },

  missingChildInParent: (
    state: UserState,
    lexeme: FirebaseLexeme,
    cx: FirebaseThoughtContext,
    parent: FirebaseParent,
    options: Options = {},
  ) => {
    missingChildInParent++

    // print before parent has been mutated
    if (options.verbose) {
      console.error(
        `{ value: "${lexeme.lemma}", rank: ${cx.rank} } appears in ThoughtContext "${cx.context}" but is not found in the corresponding Parent's children.`,
      )
      console.error('parentOld', parent)
    }

    const context = Object.values(cx.context || {})
    const id = hashContext(context)
    const children = parent.children
    const rankNew = cx.rank + smudge()
    const childNew: Child = {
      ...(cx.id ? { id: cx.id } : null),
      value: lexeme.lemma, // use Lexeme value since we the in-context value is lost
      rank: rankNew,
      lastUpdated: timestamp(),
    }
    // simulate push on FirebaseContext
    children[Object.values(children).length] = childNew
    cx.rank = rankNew

    // print after parent has been mutated
    if (options.verbose) {
      console.error('parentNew', parent)
    }
  },
}

/** Restore missing children by traversing all lexemes in an exported em db. Mutates given state. */
const restoreChildren = (state: UserState, options: Options = {}) => {
  const lexemes = Object.values(state.lexemeIndex)
  lexemes.forEach(lexeme => {
    if (limit-- <= 0) {
      console.error('Limit reached')
      process.exit(1)
    } else if (!lexeme.contexts) {
      repair.missingLexemeContext(state, lexeme, options)
      return
    }
    // convert Firebase object to array
    const contexts = Object.values(lexeme.contexts || {})
    contexts.forEach(cx => {
      if (!cx.context) {
        repair.missingThoughtContext(state, lexeme, cx, options)
      }

      const context = Object.values(cx.context || {})
      const parent = state.thoughtIndex[hashContext(context)]
      if (!parent) {
        repair.missingParents(state, lexeme, cx, options)
        return
      } else if (!parent.children) {
        throw new Error('Missing parent.childen. This was unexpected. A repair function has not been implemented.')
      }
      const childInParent = Object.values(parent.children).find(
        child => normalizeThought(child.value) === normalizeThought(lexeme.lemma),
      )
      if (!childInParent) {
        repair.missingChildInParent(state, lexeme, cx, parent, options)
        return
      }
    })
  })

  return state
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

  // reformat input json so it can easily be compared with output json
  // const fileInFormatted = `${fileIn.slice(0, -'.json'.length)}.formatted.json`
  // const fileFormatted = JSON.stringify(state, null, 2)

  restoreChildren(state, options)

  console.log('')
  console.log('Lexemes:', Object.values(state.lexemeIndex).length)
  console.log('Missing lexeme.contexts:', missingLexemeContexts)
  console.log('Missing cx.context:', missingThoughtContexts)
  console.log('Missing parent:', missingParents)
  console.log('Missing childInParent:', missingChildInParent)
  console.log('')

  // write
  const fileOut = `${fileIn.slice(0, -'.json'.length)}.repaired.json`

  if (options.dry) {
    console.log('Done')
  } else {
    // fs.writeFileSync(fileInFormatted, fileFormatted)
    // console.log(`Input state (formatted) written to: ${fileInFormatted}`)

    fs.writeFileSync(fileOut, JSON.stringify(state, null, 2))
    console.log(`Output state written to: ${fileOut}`)
  }
}

main()
