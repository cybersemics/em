// mock browser globals for page-lifecycle
global.addEventListener = () => {}
global.self = {} as any
global.document = { hasFocus: () => false } as any

import fs from 'fs'
import _ from 'lodash'
import { HOME_TOKEN } from '../../src/constants'
import { hashContext, hashThought, head, normalizeThought, timestamp, unroot } from '../../src/util'
import { Child, Context, Index, Lexeme, Parent, ThoughtContext } from '../../src/types'

// arrays are stored as objects with a numeric index in Firebase
// so we have to override array types
// (we could also convert the Firebase State to a proper State instead)
type FirebaseContext = Index<string>
type FirebaseLexeme = { contexts: Index<FirebaseThoughtContext>, value: string }
type FirebaseParent = { children: Index<Child> }
type FirebaseThoughtContext = { id?: string, context: FirebaseContext, rank: number }

interface Database {
  users: Index<UserState>
}

interface UserState {
  thoughtIndex: Index<FirebaseLexeme>,
  contextIndex: Index<FirebaseParent>,
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

  missingLexemeContexts: (state: UserState, lexeme: FirebaseLexeme) => {
    missingLexemeContexts++
    // console.warn(`Missing lexeme.contexts in "${lexeme.value}"`)

    // delete lexeme since there are no contexts to restore it to
    delete state.thoughtIndex[hashThought(lexeme.value)]
  },

  missingThoughtContexts: (state: UserState, lexeme: FirebaseLexeme) => {
    missingThoughtContexts++
    // const msg = `Missing cx.context "${lexeme.value}"`

    // delete lexeme since there are no contexts to restore it to
    delete state.thoughtIndex[hashThought(lexeme.value)]
  },

  missingParents: (state: UserState, lexeme: FirebaseLexeme, cx: FirebaseThoughtContext) => {
    missingParents++

    // recreate the missing parent
    const context = Object.values(cx.context)
    const id = hashContext(context)
    const rankNew = cx.rank + smudge()
    const childNew: Child = {
      ...cx.id ? { id: cx.id } : null,
      value: lexeme.value, // use Lexeme value since we the in-context value is lost
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
    state.contextIndex[id] = parentNew as unknown as FirebaseParent
    cx.rank = rankNew

    // const msg = `{ value: "${lexeme.value}", rank: ${cx.rank} } appears in ThoughtContext "${cx.context}" but no Parent exists.`
    // console.error(msg)
    // console.error('parentNew', parentNew)
  },

  missingChildInParent: (state: UserState, lexeme: FirebaseLexeme, cx: FirebaseThoughtContext, parent: FirebaseParent) => {
    missingChildInParent++

    // print before parent has been mutated
    // console.error(`{ value: "${lexeme.value}", rank: ${cx.rank} } appears in ThoughtContext "${cx.context}" but is not found in the corresponding Parent's children.`)
    // console.error('parentOld', parent)

    const context = Object.values(cx.context)
    const id = hashContext(context)
    const children = parent.children
    const rankNew = cx.rank + smudge()
    const childNew: Child = {
      ...cx.id ? { id: cx.id } : null,
      value: lexeme.value, // use Lexeme value since we the in-context value is lost
      rank: rankNew,
      lastUpdated: timestamp(),
    }
    // simulate push on FirebaseContext
    children[Object.values(children).length] = childNew
    cx.rank = rankNew

    // print after parent has been mutated
    // console.log('parentNew', parent)
  },

}

/** Restore missing children by traversing all lexemes in an exported em db. Mutates given state. */
const restoreChildren = (state: UserState) => {

  const lexemes = Object.values(state.thoughtIndex)
  lexemes.forEach(lexeme => {
    if (limit-- <= 0) {
      console.error('Limit reached')
      process.exit(1)
    }
    else if (!lexeme.contexts) {
      repair.missingLexemeContexts(state, lexeme)
      return
    }
    // convert Firebase object to array
    const contexts = Object.values(lexeme.contexts || {})
    contexts.forEach(cx => {

      if (!cx.context) {
        repair.missingThoughtContexts(state, lexeme)
        return
      }

      const context = Object.values(cx.context)
      const parent = state.contextIndex[hashContext(context)]
      if (!parent) {
        repair.missingParents(state, lexeme, cx)
        return
      }
      else if (!parent.children) {
        throw new Error('Missing parent.childen. This was unexpected. A repair function has not been implemented.')
      }
      const childInParent = Object.values(parent.children).find(child =>
        normalizeThought(child.value) === normalizeThought(lexeme.value)
      )
      if (!childInParent) {
        repair.missingChildInParent(state, lexeme, cx, parent)
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
  const [,,fileIn] = process.argv
  const options = process.argv.slice(2).reduce<Index<boolean>>((accum, arg) => ({
    ...arg.startsWith('--') ? { [arg.slice(2)]: true } : null,
  }), {})

  // read
  const input = fs.readFileSync(fileIn, 'utf-8')
  const db = JSON.parse(input) as Database | UserState
  const state = (db as Database).users?.[userId] || db as UserState

  // reformat input json so it can easily be compared with output json
  const fileInFormatted = `${fileIn.slice(0, -'.json'.length)}.formatted.json`
  const fileFormatted = JSON.stringify(state, null, 2)

  restoreChildren(state)

  console.log('')
  console.log('Lexemes:', Object.values(state.thoughtIndex).length)
  console.log('Missing lexeme.contexts:', missingLexemeContexts)
  console.log('Missing cx.context:', missingThoughtContexts)
  console.log('Missing parent:', missingParents)
  console.log('Missing childInParent:', missingChildInParent)
  console.log('')

  // write
  const fileOut = `${fileIn.slice(0, -'.json'.length)}.repaired.json`

  if (options.dry) {
    console.log('Done')
  }
  else
  {
    fs.writeFileSync(fileInFormatted, fileFormatted)
    fs.writeFileSync(fileOut, JSON.stringify(state, null, 2))

    console.log(`Input state (formatted) written to: ${fileInFormatted}`)
    console.log(`Output state written to: ${fileOut}`)
  }

}

main()
