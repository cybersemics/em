// mock browser globals for page-lifecycle
global.addEventListener = () => {}
global.self = {} as any
global.document = { hasFocus: () => false } as any

import fs from 'fs'
import _ from 'lodash'
import { HOME_TOKEN } from '../../src/constants'
import { hashContext, hashThought, unroot } from '../../src/util'
import { State } from '../../src/util/initialState'
import { Child, Context, Index, Parent } from '../../src/types'

const helpText = `Usage: npm run start -- em-proto-data1.json em-proto-data2.json`

interface Database {
  users: Index<RemoteState>
}

interface RemoteState {
  thoughtIndex: State['thoughts']['thoughtIndex'],
  contextIndex: State['thoughts']['contextIndex'],
}

const appendContext = (context: Context, child: string) =>
  unroot([...context, child])

/** Traverses the contextIndex, calling a function for each context. */
const traverse = (state: RemoteState, f: (parent: Parent) => void, options: { context: Context } = { context: [HOME_TOKEN] }) => {
  const context = options.context
  const parent = state.contextIndex[hashContext(context)]
  if (parent) {
    f(parent)
    ;(parent.children ? Object.values(parent.children) : []).forEach(child =>
      traverse(state, f, { context: appendContext(context, child.value) })
    )
  }
}

/*****************************************************************
 * MAIN
 *****************************************************************/
const main = () => {

  const [,,file1, file2] = process.argv

  // check args
  if (process.argv.length < 4) {
    console.info(helpText)
    process.exit(0)
  }

  // read
  console.info('Reading ' + file1)
  const input1 = fs.readFileSync(file1, 'utf-8')
  const state1 = JSON.parse(input1) as Database

  console.info('Reading ' + file2)
  const input2 = fs.readFileSync(file2, 'utf-8')
  const state2 = JSON.parse(input2) as Database

  // diff
  traverse(state1.users.m9S244ovF7fVrwpAoqoWxcz08s52, (parent: Parent) => {
    console.log(Object.values(parent.context))
  })

}

main()
