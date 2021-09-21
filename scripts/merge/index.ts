/*************************************************************************
 * MODULE IMPORTS
 ************************************************************************/

import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import _ from 'lodash'
import { v4 as uid } from 'uuid'
import memoryStore from './memoryStore'

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
import { hashContext, hashThought, head, initialState, isRoot, timestamp, unroot } from '../../src/util'
import { exportContext, hasLexeme } from '../../src/selectors'
import { importText } from '../../src/reducers'
import {
  Child,
  Context,
  Index,
  Lexeme,
  Parent,
  State,
  Timestamp,
  ThoughtContext,
  ThoughtIndices,
} from '../../src/@types'

/*************************************************************************
 * TYPES
 ************************************************************************/

interface Database {
  users: Index<RawThoughts>
}

interface FirebaseParent {
  id?: string
  // firebase stores arrays as objects
  children: Index<Child>
  context: Context
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

const helpText = `Usage: node build/scripts/merge/index.js em-proto-current.json em-proto-backup.json`

let prevContext: Context = []

const stateStart = initialState()

/*****************************************************************
 * SCRIPT
 *****************************************************************/

/** Read a thought database from file. Normalizes contextIndex and thoughtIndex property names. */
const readThoughts = (file: string): FirebaseThoughts => {
  const input = fs.readFileSync(file, 'utf-8')
  const db = JSON.parse(input)
  const state = db.users?.[userId] || db

  // rename contextChildren -> contextIndex
  if (state.contextChildren) {
    state.contextIndex = state.contextChildren
    delete state.contextChildren
  }

  // rename data -> thoughtIndex
  if (state.data) {
    state.thoughtIndex = state.data
    delete state.data
  }

  return state
}

/** Adds a context property to a Parent based on the context stored in thoughtIndex. Leaves thoughtIndex as-is since it is not used. */
const recreateParentContexts = (thoughts: FirebaseThoughts | ThoughtIndices): FirebaseThoughts | ThoughtIndices => {
  // if the contextIndex already has Parent contexts, return it as-is
  // assume the first Parent is representative
  const firstParent = Object.values(thoughts.contextIndex)[0] as Parent | FirebaseParent
  if (firstParent.context) return thoughts

  const lexemes = Object.values(thoughts.thoughtIndex)
  console.info(`Recreating incomplete Parents from ${chalk.cyan(lexemes.length)} Lexemes`)

  const updatedBy = uid()

  // build a new contextIndex by iterating through each legacy Lexeme
  const contextIndex = lexemes.reduce<Index<Parent>>((accum, lexeme) => {
    // invalid Lexeme
    if (lexeme.value == null) return accum

    // read legacy memberOf property as contexts
    const contexts: ThoughtContext[] = Object.values((lexeme as any).memberOf || lexeme.contexts || {})

    // skip missing contexts
    if (!contexts) return accum

    // add each legacy ThoughtContext as a Child to a Parent
    contexts.forEach(cx => {
      // skip missing context
      if (!cx.context) return

      // handle Firebase "array"
      const context = Object.values(cx.context)
      const key = hashContext(context)
      const parentOld = accum[key]
      const childrenOld = parentOld?.children || []
      accum[key] = {
        ...parentOld,
        id: key,
        children: [...childrenOld, { value: lexeme.value, rank: cx.rank || Math.random() * 10e8 }],
        context: context,
        lastUpdated: cx.lastUpdated || timestamp(),
        updatedBy,
      }
    })

    return accum
  }, {})

  const thoughtsNew: ThoughtIndices & { isContextIndexRehashed: boolean } = {
    contextIndex,
    thoughtIndex: thoughts.thoughtIndex,
    // track recalculated contexthash to avoid recalculating again in mergeThoughts
    isContextIndexRehashed: true,
  }

  return thoughtsNew
}

/** Normalizes the contextIndex by converting Firebase "arrays" to proper arrays and recalculating context hashes. Skips hash recalculation if isContextIndexRehashed is true. */
const normalizeThoughts = (thoughts: FirebaseThoughts | ThoughtIndices): ThoughtIndices => {
  // if the contextIndex already has proper arrays and a modern ROOT hash, return it as-is
  // assume the first Parent is representative
  const firstParent = Object.values(thoughts.contextIndex)[0] as Parent | FirebaseParent
  const isModernHash = '6f94eccb7b23a8040cd73b60ba7c5abf' in thoughts.contextIndex
  if (Array.isArray(firstParent.context) && Array.isArray(firstParent.children) && isModernHash)
    return thoughts as ThoughtIndices

  const numParents = Object.keys(thoughts.contextIndex).length
  console.info(`Normalizing ${chalk.cyan(numParents)} Parents`)

  // track how many parents do not have a context property
  // a few are okay, but they are skipped so en masse is a problem
  let missingContexts = 0

  // recalculate contextIndex hashes
  // thoughtIndex is not used, so we don't have to rehash it
  const contextIndexNew = Object.keys(thoughts.contextIndex as Index<FirebaseParent>).reduce((accum, key) => {
    const parent = thoughts.contextIndex[key]

    // there are some invalid Parents with missing context field
    if (!parent.context) {
      missingContexts++
      return {}
    }

    // convert Parent.children Firebase "array"
    const children = Object.values(parent.children || {})
    const context = Object.values(parent.context || {})

    // convert FirebaseContext to actual array
    const keyNew = (thoughts as any).isContextIndexRehashed || isModernHash ? key : hashContext(context)

    return {
      ...accum,
      [keyNew]: {
        ...parent,
        id: keyNew,
        children,
        context,
      },
    }
  }, {})

  if (missingContexts > 10) {
    console.warn('More than 10 Parents with missing context property:', missingContexts)
  }

  return {
    ...thoughts,
    contextIndex: contextIndexNew,
  }
}

/** Merges thoughts into current state using importText to handle duplicates and merged descendants. */
const mergeThoughts = (state: State, thoughts: ThoughtIndices) => {
  console.info(`Exporting ${chalk.cyan(Object.keys(thoughts.contextIndex).length)} Parents to HTML`)
  const html = exportContext(
    {
      ...stateStart,
      thoughts: {
        ...stateStart.thoughts,
        ...thoughts,
      },
    },
    [HOME_TOKEN],
  )

  console.info(
    `Importing HTML into ${chalk.cyan(Object.keys(state.thoughts.contextIndex).length)} Parents of current db`,
  )
  const stateNew = importText(state, { text: html })

  return stateNew
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
  console.info(`Reading current thoughts: ${file1}`)
  const thoughtsCurrentRaw = readThoughts(file1)

  const thoughtsCurrentWithContexts = recreateParentContexts(thoughtsCurrentRaw)
  const thoughtsCurrent = normalizeThoughts(thoughtsCurrentWithContexts)

  // read thoughts to be imported
  // this can be a directory or a file
  const filesToImport = fs.lstatSync(file2).isDirectory()
    ? fs.readdirSync(file2).map(file => `${file2}/${file}`)
    : [file2]

  // accumulate the new state by importing each input
  let stateNew: State = { ...stateStart, thoughts: thoughtsCurrent }
  const errors: ErrorLog[] = []
  const success: string[] = []

  filesToImport.forEach(file => {
    // skip hidden files including .DS_Store
    if (path.basename(file).startsWith('.')) return

    let thoughtsImported: ThoughtIndices

    try {
      console.info(`Reading thoughts: ${file}`)
      const thoughtsImportedRaw = readThoughts(file)

      const thoughtsImportedWithContexts = recreateParentContexts(thoughtsImportedRaw)
      thoughtsImported = normalizeThoughts(thoughtsImportedWithContexts)
    } catch (e) {
      console.error('Error reading')
      errors.push({ e: e as Error, file, message: 'Error reading' })
      return
    }

    try {
      const stateImported = mergeThoughts(stateNew, thoughtsImported)
      stateNew = stateImported

      // if we made it this far, there was no error
      success.push(file)
    } catch (e) {
      console.error('Error merging')
      errors.push({ e: e as Error, file, message: 'Error merging' })
      return
    }
  })

  // write new state to output directory
  fs.mkdirSync('output', { recursive: true })

  // merge updated thoughts back into firebase db
  const dbNew = {
    ...thoughtsCurrent,
    contextIndex: stateNew.thoughts.contextIndex,
    thoughtIndex: stateNew.thoughts.thoughtIndex,
  }
  const fileNew = `output/${file1Base}-merged${file1Ext}`
  console.info(
    `Writing new database with ${chalk.cyan(Object.keys(stateNew.thoughts.contextIndex).length)} Parents to output`,
  )
  fs.writeFileSync(fileNew, JSON.stringify(dbNew, null, 2))

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
