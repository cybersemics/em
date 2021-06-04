// mock browser globals for page-lifecycle
global.addEventListener = () => {}
global.self = {} as any
global.document = { hasFocus: () => false } as any

import fs from 'fs'
import _ from 'lodash'
import { HOME_TOKEN } from '../../src/constants'
import { hashContext, hashThought, head, normalizeThought, unroot } from '../../src/util'
import { Child, Context, Index, Lexeme, Parent, ThoughtContext } from '../../src/types'

// arrays are stored as objects with a numeric index in Firebase
// so we have to override array types
// (we could also convert the Firebase State to a proper State instead)
type FirebaseLexeme = { contexts: Index<FirebaseThoughtContext>, value: string }
type FirebaseParent = { children: Index<Child> }
type FirebaseThoughtContext = { context: Index<string> }

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
let missingParentChildren = 0
let missingChildInParent = 0

const restoreChildren = (state: UserState) => {

  const lexemes = Object.values(state.thoughtIndex)
  lexemes.forEach(lexeme => {
    if (limit-- <= 0) {
      console.error('Limit reached')
      process.exit(1)
    }
    else if (!lexeme.contexts) {
      missingLexemeContexts++
      console.warn(`Missing lexeme.contexts in "${lexeme.value}"`)
    }
    // convert Firebase object to array
    const contexts = Object.values(lexeme.contexts || {})
    contexts.forEach(cx => {

      if (!cx.context) {
        missingThoughtContexts++
        const msg = `Missing cx.context "${lexeme.value}"`
        console.error(msg)
        return
      }

      const context = Object.values(cx.context)
      const parent = state.contextIndex[hashContext(context)]
      if (!parent) {
        missingParents++
        // const msg = `Parent of Lexeme "${lexeme.value}" missing from ThoughtContext "${context}"`
        // throw new Error(msg)
        return
      }
      else if (!parent.children) {
        missingParentChildren++
        // const msg = `Missing children of "${lexeme.value}" missing from ThoughtContext "${context}"`
        // console.error(msg)
        // console.error('parent', parent)
        return
      }
      const childInParent = Object.values(parent.children).find(child =>
        normalizeThought(child.value) === normalizeThought(lexeme.value)
      )
      // console.log('value', lexeme.value)
      // console.log('cx', cx)
      // console.log('childInParent', childInParent)
      if (!childInParent) {
        missingChildInParent++
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

  const [,,file1, file2] = process.argv

  // check args
  if (process.argv.length < 3) {
    console.info(helpText)
    process.exit(0)
  }

  // read
  const input = fs.readFileSync(file1, 'utf-8')
  const db = JSON.parse(input) as Database | UserState
  const state = (db as Database).users?.[userId] || db as UserState

  restoreChildren(state)

  console.log('')
  console.log('Lexemes:', Object.values(state.thoughtIndex).length)
  console.log('Missing lexeme.contexts:', missingLexemeContexts)
  console.log('Missing cx.context:', missingThoughtContexts)
  console.log('Missing parent:', missingParents)
  console.log('Missing parent.children:', missingParentChildren)
  console.log('Missing childInParent:', missingChildInParent)
  console.log('')

  // write
  console.log('Done')

}

main()
