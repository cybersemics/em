/*************************************************************************
 * MODULE IMPORTS
 ************************************************************************/

import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import _ from 'lodash'
import { v4 as uid } from 'uuid'
import memoryStore from './memoryStore'
import time from './time'

/*************************************************************************
 * MOCK BROWSER
 ************************************************************************/

global.addEventListener = () => {}
global.self = {} as any
global.document = {
  createElement: () => {
    return {
      innerHTML: '',
      get textContent() {
        return this.innerHTML
      },
    }
  },
  hasFocus: () => false,
} as any
global.sessionStorage = memoryStore()
global.localStorage = memoryStore()

/*************************************************************************
 * EM IMPORTS
 ************************************************************************/

import { HOME_TOKEN } from '../../src/constants'
import {
  contextToThoughtId,
  createId,
  hashContext,
  hashThought,
  head,
  initialState,
  isRoot,
  parentOf,
  timestamp,
  unroot,
} from '../../src/util'
import {
  contextToPath,
  exportContext,
  getAllChildren,
  getLexeme,
  getThoughtById,
  hasLexeme,
  pathToThought,
} from '../../src/selectors'
import { importText } from '../../src/reducers'
import { Context, Index, Lexeme, State, Timestamp, Thought, ThoughtContext, ThoughtIndices } from '../../src/@types'

/*************************************************************************
 * TYPES
 ************************************************************************/

interface Database {
  users: Index<RawThoughts>
}

interface Child {
  id: string
  lastUpdated: Timestamp
  rank: number
  value: string
}

interface FirebaseParent {
  id?: string
  // firebase stores arrays as objects
  children: Index<Child>
  context: Index<string>
  lastUpdated: Timestamp
  pending?: boolean
  updatedBy: string
}

interface FirebaseThoughts {
  contextIndex: Index<FirebaseParent>
  // Firebase thoughtIndex is actually a FirebaseLexeme, but exportContext doesn't use it so we can quiet the type checker
  thoughtIndex: Index<Lexeme>
}

type RawThoughts = FirebaseThoughts | ThoughtIndices

interface ErrorLog {
  e: Error
  file: string
  message: string
}

/*************************************************************************
 * CONSTANTS
 ************************************************************************/

const userId = 'm9S244ovF7fVrwpAoqoWxcz08s52'

const helpText = `Usage:
  node build/scripts/merge-dbs/index.js ~/em-backups/2022-05-16.json  ~/em-backups/backups\ 2021-01-01\ -\ 2021-01-31
`

const sessionId = createId()

let prevContext: Context = []

const stateStart = initialState()

/*****************************************************************
 * SCRIPT
 *****************************************************************/

// /** Gets the number of Lexemes in the State or Thoughts. */
// const numLexemes = (stateOrThoughts: State | ThoughtIndices | FirebaseThoughts) =>
//   Object.keys(((stateOrThoughts as State).thoughts || (stateOrThoughts as ThoughtIndices)).thoughtIndex).length

// /** Gets the number of Parents in the State or Thoughts. */
// const numParents = (stateOrThoughts: State | ThoughtIndices | FirebaseThoughts) =>
//   Object.keys(((stateOrThoughts as State).thoughts || (stateOrThoughts as ThoughtIndices)).contextIndex).length

/** Read a thought database from file. Normalizes contextIndex and thoughtIndex property names. */
const readThoughts = (file: string): RawThoughts => {
  const t = time()
  const input = fs.readFileSync(file, 'utf-8')
  const db = JSON.parse(input)
  const rawThoughts = db.users?.[userId] || db

  // rename contextChildren -> contextIndex
  if (rawThoughts.contextChildren) {
    rawThoughts.contextIndex = rawThoughts.contextChildren
    delete rawThoughts.contextChildren
  }

  // rename data -> thoughtIndex
  if (rawThoughts.data) {
    rawThoughts.thoughtIndex = rawThoughts.data
    delete rawThoughts.data
  }

  // console.info(`${chalk.blue(numParents(rawThoughts))} Parents read`)
  // console.info('Done reading')

  const numThoughts = Object.keys(rawThoughts.contextIndex || rawThoughts.thoughtIndex).length

  console.info(`${numThoughts} thoughts read (${t.measure()}s)`)
  console.info(`lastUpdated: ${(rawThoughts as any).lastUpdated}`)

  return rawThoughts
}

/** Since the legacy contextIndex has no context property, it is impossible traverse the tree without the original hash function. Instead, recreate the contextIndex with new hashes from the thoughtIndex, which does have the context. Converts Firebase "arrays" to proper arrays. Leaves thoughtIndex as-is since it is not used to merge thoughts. */
const recreateParents = (thoughts: FirebaseThoughts | ThoughtIndices): ThoughtIndices => {
  const lexemes = Object.values(thoughts.thoughtIndex)
  console.info(`Recalculating context hash from ${chalk.blue(lexemes.length)} Lexemes`)

  const updatedBy = uid()

  return {
    thoughtIndex: {},
    lexemeIndex: {},
  }

  // // // build a new contextIndex by iterating through each legacy Lexeme
  // // const contextIndex = lexemes.reduce<Index<Parent>>((accum, lexeme) => {
  // //   // invalid Lexeme
  // //   if (lexeme.value == null) return accum

  // //   // read legacy memberOf property as contexts
  // //   const contexts: ThoughtContext[] = Object.values((lexeme as any).memberOf || lexeme.contexts || {})

  // //   // skip missing contexts
  // //   if (!contexts) return accum

  // //   // add each legacy ThoughtContext as a Child to a Parent
  // //   contexts.forEach(cx => {
  // //     // skip ThoughtContext without context property
  // //     if (!cx.context) return

  // //     const context = Object.values(cx.context)
  // //     const key = hashContext(context)
  // //     const parentOld = accum[key]
  // //     const childrenOld = Object.values(parentOld?.children || {})
  // //     accum[key] = {
  // //       ...parentOld,
  // //       id: key,
  // //       children: [...childrenOld, { value: lexeme.value, rank: cx.rank || Math.random() * 10e8 }],
  // //       context,
  // //       lastUpdated: cx.lastUpdated || timestamp(),
  // //       updatedBy,
  // //     }
  // //   })

  // //   return accum
  // // }, {})

  // const thoughtsNew: ThoughtIndices & { isContextIndexRehashed: boolean } = {
  //   contextIndex,
  //   thoughtIndex: thoughts.thoughtIndex,
  //   // track recalculated contexthash to avoid recalculating again in mergeThoughts
  //   isContextIndexRehashed: true,
  // }

  // return thoughtsNew
}

/** Normalizes the contextIndex by converting Firebase "arrays" to proper arrays and recalculating context hashes if needed. Skips hash recalculation if isContextIndexRehashed is true. */
// const normalizeFirebaseArrays = (thoughts: FirebaseThoughts | ThoughtIndices): ThoughtIndices => {
//   // if the contextIndex already has proper arrays, return it as-is to avoid NOOP iteration
//   // assume the first Parent is representative
//   const firstParent = Object.values(thoughts.contextIndex)[0] as Parent | FirebaseParent
//   if (Array.isArray(firstParent.context) && Array.isArray(firstParent.children)) return thoughts as ThoughtIndices

//   console.info(`Normalizing ${chalk.blue(numParents(thoughts))} Parents`)

//   // track how many parents do not have a context property
//   // a few are okay, but they are skipped so en masse is a problem
//   let missingContexts = 0

//   // convert Firebase "arrays" to proper arrays
//   // thoughtIndex is not used, so we don't have to normalize it
//   const contextIndexNew = Object.keys(thoughts.contextIndex as Index<FirebaseParent>).reduce((accum, key) => {
//     const parent = thoughts.contextIndex[key]

//     // there are some invalid Parents with missing context field
//     if (!parent.context) {
//       missingContexts++
//       return {}
//     }

//     // convert Parent.children Firebase "array"
//     const children = Object.values(parent.children || {})
//     const context = Object.values(parent.context || {})

//     return {
//       ...accum,
//       [key]: {
//         ...parent,
//         children,
//         context,
//       },
//     }
//   }, {})

//   if (missingContexts > 10) {
//     console.warn('More than 10 Parents with missing context property:', missingContexts)
//   }

//   return {
//     ...thoughts,
//     contextIndex: contextIndexNew,
//   }
// }

/** Insert a new thought by directly modifying state. */
const createThought = (state: State, context: Context, value: string, { rank }: { rank?: number } = {}) => {
  // TODO: Avoid redundant contextToPath
  const parentId = (() => {
    if (context.length <= 1) return HOME_TOKEN
    const contextParent = parentOf(context)
    const parentId = contextToThoughtId(state, contextParent)
    if (!parentId) {
      throw new Error(`Expected parent to exist: ${contextParent.join(', ')}`)
    }
    return parentId
  })()

  // create Thought
  const id = createId()
  const lastUpdated = timestamp()
  const thought: Thought = {
    id,
    children: [],
    lastUpdated,
    updatedBy: sessionId,
    value,
    rank: rank || Math.floor(Math.random() * 10000),
    parentId,
  }

  // add to parent
  const parent = getThoughtById(state, parentId)
  parent.children.push(id)

  // create Lexeme if it doesn't exist
  const lexeme: Lexeme = {
    ...(getLexeme(state, value) || {
      id: createId(),
      value,
      contexts: [],
      created: lastUpdated,
      lastUpdated,
      updatedBy: sessionId,
    }),
  }

  // add thought to Lexeme contexts
  lexeme.contexts.push(id)

  // update state.thoughts
  // parent thought has already been mutated
  state.thoughts.thoughtIndex[id] = thought
  state.thoughts.lexemeIndex[hashThought(value)] = lexeme
  return state
}

/** Recursively reconstructs the context and all its ancestors. */
const reconstructThought = (state: State, context: Context, { rank }: { rank?: number } = {}): State => {
  // check the existence of the full context immediately so that we can avoid recursion
  const path = contextToPath(state, context)
  if (path) {
    // override the rank in case the thought was originally created from a Parent with no rank
    if (rank !== undefined) {
      const thought = pathToThought(state, path)
      thought.rank = rank
    }
    return state
  }

  // reconstruct each ancestor and then the thought itself
  context.forEach((value, i) => {
    const contextAncestor = context.slice(0, i + 1)

    // reuse the full path check from the beginning to avoid recursion
    const pathAncestor = i === context.length - 1 && !path ? null : contextToPath(state, contextAncestor)

    // reconstruct thought
    if (!pathAncestor) {
      // console.log('Creating thought', contextAncestor)
      state = createThought(state, contextAncestor, value, { rank })

      // console.log('new thought', thought)
      // console.log('new lexeme', lexeme)
    } else {
      // TODO: Count if exists (only for i === context.length - 1)
      // console.log('pathAncestor exists: ', contextAncestor)
      // throw new Error('STOP')
    }
  })

  return state
}

/** Merges thoughts into current state using importText to handle duplicates and merged descendants. */
const mergeThoughts = (state: State, thoughts: RawThoughts) => {
  /** Checks if the contextIndex uses the most up-to-date hashing function by checking the existence of the root context hash. This is NOT sufficient to determine if all Parents have a context property, which was added incrementally without a schemaVersion change. */
  // const isModernHash = (thoughts: FirebaseThoughts) => '6f94eccb7b23a8040cd73b60ba7c5abf' in thoughts.contextIndex

  const t = time()

  // schema v5
  if ('lexemeIndex' in thoughts) {
    console.log('Schema: v5')
  }
  // schema v3–4
  else if ('contextIndex' in thoughts) {
    if ('6f94eccb7b23a8040cd73b60ba7c5abf' in thoughts.contextIndex) {
      console.log('Schema: Modern hashing function')
    } else {
      console.log('Schema: Other with contextHash')

      Object.values(thoughts.contextIndex).forEach(parent => {
        if (!parent.context) {
          // TODO: Count missing context
          // console.info('Missing context')
          return
        }

        const context = Object.values(parent.context)
        state = reconstructThought(state, context)

        const children = Object.values(parent.children)
        children.forEach(child => {
          // unlike Parents, children actually have rank
          state = reconstructThought(state, unroot([...context, child.value]), { rank: child.rank })
        })

        // TODO: Verify that the Path exists now
        // const path = contextToPath(state, ['__ROOT__'])
      })
    }
  }
  // schema unrecognized
  else {
    throw new Error('Schema: Unrecognized. Properties: ' + Object.keys(thoughts).join(', '))
  }

  // console.info(`Exporting ${chalk.blue(numParents(thoughts))} Parents to HTML`)
  // const stateBackup: State = {
  //   ...stateStart,
  //   thoughts: {
  //     ...stateStart.thoughts,
  //     ...thoughts,
  //   },
  // }

  // import each child individually to reduce memory usage
  // const stateNew = getAllChildren(stateBackup, [HOME_TOKEN]).reduce((stateAccum, childId) => {
  //   const child = getThoughtById(stateAccum, childId)
  //   console.info(`Exporting ${child.value}`)
  //   const html = exportContext(stateBackup, [child.value])
  //   console.info(`Importing ${child.value}`)
  //   const stateNew = importText(stateAccum, { text: html })
  //   // console.info(
  //   //   `New state has ${chalk.blue(numParents(stateNew))} Parents and ${chalk.blue(numLexemes(stateNew))} Lexemes`,
  //   // )

  //   return stateNew
  // }, state)

  console.info(`Thoughts merged (${t.measure()}s)`)

  return state
}

const main = () => {
  const [, , file1, file2] = process.argv

  // check args
  if (process.argv.length < 4) {
    console.info(helpText)
    process.exit(0)
  }

  const basename = path.basename(file1)
  const indexExt = basename.lastIndexOf('.')
  const file1Base = basename.slice(0, indexExt)
  const file1Ext = basename.slice(indexExt)

  // read base thoughts
  // assume that they use schema v5
  console.info(`Reading current thoughts: ${file1}`)
  const thoughtsCurrent = readThoughts(file1) as unknown as ThoughtIndices
  console.info('')

  // read backup thoughts to be imported
  // this can be a directory or a file
  const filesToImport = fs.lstatSync(file2).isDirectory()
    ? fs.readdirSync(file2).map(file => `${file2}/${file}`)
    : [file2]

  // create a new state with the current thoughts
  let state: State = { ...stateStart, thoughts: thoughtsCurrent }
  const errors: ErrorLog[] = []
  const success: string[] = []

  filesToImport.forEach(file => {
    // skip hidden files including .DS_Store
    if (path.basename(file).startsWith('.')) return

    let thoughtsBackup: RawThoughts

    try {
      console.info(`Reading thoughts: ${file}`)
      thoughtsBackup = readThoughts(file)
    } catch (e) {
      console.error('Error reading')
      errors.push({ e: e as Error, file, message: 'Error reading' })
      console.info('')
      return
    }

    // TODO: Check log to see if the backup has already been imported

    try {
      // replace state with merged thoughts
      state = mergeThoughts(state, thoughtsBackup)

      // TODO: Save progress

      // if we made it this far, there was no error
      success.push(file)
    } catch (e) {
      console.error('Error merging')
      errors.push({ e: e as Error, file, message: 'Error merging' })
      console.info('')
      return
    }

    console.info('')
  })

  // write new state to output directory
  fs.mkdirSync('output', { recursive: true })

  // merge updated thoughts back into firebase db
  const dbNew = {
    ...thoughtsCurrent,
    thoughtIndex: state.thoughts.thoughtIndex,
    lexemeIndex: state.thoughts.lexemeIndex,
  }
  const fileNew = `output/${file1Base}-merged${file1Ext}`

  const t = time()

  // console.info(`Writing new database with ${chalk.blue(numParents(state))} Parents to output`)
  fs.writeFileSync(fileNew, JSON.stringify(dbNew, null, 2))

  console.info(`Thoughts written (${t.measure()}s)`)

  if (errors.length === 0) {
    console.info(chalk.green('SUCCESS'))
  } else {
    console.info('Writing error log')
    const debugOutput = errors.map(error => `${error.file}\n${error.message}\n${error.e.stack}`).join('\n')
    fs.writeFileSync('output/debug.log', debugOutput)

    if (success.length > 0) {
      console.info('')
      console.info('Files that did get merged:')
      success.forEach(file => console.error(file))
    }

    console.info('Files that did not get merged:')
    errors.forEach(error => console.error(error.file))

    console.info(
      `${chalk.red(
        success.length > 0 ? 'PARTIAL SUCCESS' : 'FAIL',
      )}! See output/debug.log for error messages and stack trace.`,
    )
  }
}

main()
