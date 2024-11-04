import fs from 'fs'
import _ from 'lodash'
import Child from '../../src/@types/Child'
import Context from '../../src/@types/Context'
import Index from '../../src/@types/Index'
import Parent from '../../src/@types/Parent'
import { HOME_TOKEN } from '../../src/constants'
import hashContext from '../../src/util/hashContext'
import hashThought from '../../src/util/hashThought'
import head from '../../src/util/head'
import { State } from '../../src/util/initialState'
import unroot from '../../src/util/unroot'

// mock browser globals for page-lifecycle
global.addEventListener = () => {}
global.self = {} as any
global.document = { hasFocus: () => false } as any

const userId = 'm9S244ovF7fVrwpAoqoWxcz08s52'

const helpText = `Usage: npm run start -- em-proto-data_OLD.json em-proto-data-NEW.json`

let prevContext: Context = []

interface Database {
  users: Index<UserState>
}

interface UserState {
  lexemeIndex: State['thoughts']['lexemeIndex']
  thoughtIndex: State['thoughts']['thoughtIndex']
}

const appendContext = (context: Context, child: string) => unroot([...context, child])

/** Traverses the thoughtIndex, calling a function for each context. */
const traverse = (
  state: UserState,
  f: (parent: Parent) => void,
  options: { context: Context } = { context: [HOME_TOKEN] },
) => {
  const context = options.context
  const parent = state.thoughtIndex[hashContext(context)]
  if (parent) {
    f(parent)
    ;(parent.children ? Object.values(parent.children) : []).forEach(child =>
      traverse(state, f, { context: appendContext(context, child.value) }),
    )
  }
}

/** Repeats a string n time. */
const repeat = (s: string, n: number) => new Array(n).fill(s).join('')

/** Removes <li> to avoid the importText bug that misinterprets the whole file as HTML. */
const scrub = (s: string) =>
  s
    .replace(/\<\/?li\>/gi, '')
    .replace(/em\>/gi, 'i>') // #1131
    .replace(/\<br\>$/gi, '') // #1131
    .replace(/<span.*?>/gi, '') // #1131

/** Renders a single thought for a context. Does not fill in missing ancestors. */
const renderContext = (context: Context): string => `${repeat(' ', context.length)}- ${scrub(head(context))}`

/** Renders a thought. */
const renderThought = (parent: Parent): string => {
  const context = Object.values(parent.context)
  const children = Object.values(parent.children)
  return children.map(child => renderContextWithAncestors([...context, child.value])).join('\n')
}

/** Renders a context as nested thoughts. */
const renderContextWithAncestors = (context: Context): string => {
  // return context.join('/').replace(/\<\/?li\>/gi, '')

  const indexDiffersFromPrev = context.findIndex((value: string, i: number) => value !== prevContext[i])

  // if all ancestors were rendered previously, just render the thought
  if (indexDiffersFromPrev === -1) {
    return renderContext(context)
  }

  const ancestorsDifferFromPrev = context.slice(indexDiffersFromPrev)

  const output = ancestorsDifferFromPrev
    .map((value, i) => {
      const ancestorContext = context.slice(0, indexDiffersFromPrev + i + 1)
      return ancestorContext.length > 0 ? renderContext(ancestorContext) : ''
    })
    // .map((value, i) => renderContextWithAncestors(context.slice(0, indexDiffersFromPrev + i)))
    .join('\n')

  prevContext = context

  return output
}

/*****************************************************************
 * MAIN
 *****************************************************************/
const main = () => {
  const [, , file1, file2] = process.argv

  // check args
  if (process.argv.length < 4) {
    console.info(helpText)
    process.exit(0)
  }

  // Output file header thoughts
  console.log('- Diff')
  console.log(`  - ${file1}`)
  console.log(`  - ${file2}`)
  console.log(`- Missing`)
  console.log(`  - =note`)
  console.log(`    - from ${file2}`)

  // read
  const input1 = fs.readFileSync(file1, 'utf-8')
  const db1 = JSON.parse(input1) as Database | UserState
  const state1 = (db1 as Database).users?.[userId] || (db1 as UserState)

  const input2 = fs.readFileSync(file2, 'utf-8')
  const db2 = JSON.parse(input2) as Database | UserState
  const state2 = (db2 as Database).users?.[userId] || (db2 as UserState)

  // diff
  traverse(state1, (parent1: Parent) => {
    const context = Object.values(parent1.context)
    const parent2 = state2.thoughtIndex[hashContext(context)]

    // ignore archived thoughts
    if (context.includes('=archive')) return

    if (!parent2) {
      console.log(renderThought(parent1))
    }
  })
}

main()
