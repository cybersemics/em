/*************************************************************************
 * MODULE IMPORTS
 ************************************************************************/

import fs from 'fs'
import path from 'path'
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
import { hashContext, hashThought, head, initialState, isRoot, keyValueBy, timestamp, unroot } from '../../src/util'
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

// Parent before context was added
interface LegacyChild {
  created: Timestamp
  key: string
  lastUpdated: Timestamp
  rank: number
}

interface LegacyThoughtContext {
  context: Context
  lastUpdated: Timestamp
  rank: number
}

interface LegacyLexeme {
  value: string
  memberOf: LegacyThoughtContext[]
  created: Timestamp
  lastUpdated: Timestamp
}

interface FirebaseLexeme {
  id?: string
  value: string
  // firebase stores arrays as objects
  contexts: Index<ThoughtContext>
  created: Timestamp
  lastUpdated: Timestamp
  updatedBy?: string
}

interface FirebaseThoughts {
  contextIndex: Index<FirebaseParent>
  // Firebase thoughtIndex is actually a FirebaseLexeme, but exportContext doesn't use it so we can quiet the type checker
  thoughtIndex: Index<Lexeme>
}

interface LegacyThoughts {
  contextChildren: Index<LegacyChild[]>
  data: Index<LegacyLexeme>
}

type RawThoughts = FirebaseThoughts | LegacyThoughts | ThoughtIndices

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

/** Read a thought database from file and convert arrays that are stored in Firebase as objects to proper arrays. */
const readThoughts = (file: string): RawThoughts => {
  const input = fs.readFileSync(file, 'utf-8')
  const db = JSON.parse(input) as Database | RawThoughts
  return (db as Database).users?.[userId] || (db as RawThoughts)
}

/** Converts old contextChildren schema to contextIndex. Leaves thoughtIndex empty since it is not used. */
const convertLegacyThoughts = (thoughts: RawThoughts): FirebaseThoughts | ThoughtIndices => {
  // if already modern, return as-is
  if ('contextIndex' in thoughts) return thoughts as FirebaseThoughts | ThoughtIndices

  const updatedBy = uid()

  // build a new contextIndex by iterating through each legacy Lexeme
  const contextIndex = Object.values(thoughts.data).reduce<Index<Parent>>((accum, lexeme) => {
    // skip missing memberOf
    if (!lexeme.memberOf) {
      console.warn('Missing memberOf', lexeme)
      return accum
    }

    // add each legacy ThoughtContext as a Child
    lexeme.memberOf.forEach(cx => {
      // skip missing context
      if (!cx.context) {
        console.warn('Missing context', cx)
        return
      }
      const key = hashContext(cx.context)
      accum[key] = {
        ...accum[key],
        id: key,
        // add a new child to the old Parent
        children: [...(accum[key]?.children || []), { value: lexeme.value, rank: cx.rank }],
        context: cx.context,
        lastUpdated: cx.lastUpdated,
        updatedBy,
      }
    })

    return accum
  }, {})

  const thoughtsNew: ThoughtIndices = {
    contextIndex,
    thoughtIndex: {},
  }

  return thoughtsNew
}

/** Reads thoughts that were exported from Firebase. Converts Parent children to proper arrays. If thoughts are already in the correct format, return as-is. */
const convertParentChildren = (thoughts: FirebaseThoughts | ThoughtIndices): ThoughtIndices => {
  // if already converted, return as-is
  const firstParent = Object.values(thoughts.contextIndex)[0] as Parent | FirebaseParent
  const isConverted = Array.isArray(firstParent.children)
  if (isConverted) return thoughts as unknown as ThoughtIndices

  const contextIndex = keyValueBy(thoughts.contextIndex as Index<FirebaseParent>, (key, parent) => {
    return {
      [key]: {
        ...parent,
        children: Object.values(parent.children || {}),
      },
    }
  })

  return {
    contextIndex,
    thoughtIndex: thoughts.thoughtIndex,
  }
}

/** Merges thoughts into current state using importText to handle duplicates and merged descendants. */
const mergeThoughts = (state: State, thoughts: ThoughtIndices) => {
  // track how many parents do not have a context property
  // a few are okay, but they are skipped so en masse is a problem
  let missingContexts = 0

  const numParents = Object.keys(thoughts.contextIndex).length
  console.info(`Recalculating ${numParents} contextIndex hashes`)
  // recalculate contextIndex hashes
  // thoughtIndex is not used, so we don't have to rehash it
  const contextIndexRehashed = keyValueBy(thoughts.contextIndex, (key, parent) => {
    // there are some invalid Parents with missing context field
    if (!parent.context) {
      missingContexts++
      console.warn('Missing Parent context', parent)
      return {}
    }

    // convert FirebaseContext to actual array
    const keyNew = hashContext(Object.values(parent.context))
    return {
      [keyNew]: {
        ...parent,
        id: keyNew,
      },
    }
  })

  console.info(`Exporting HTML of ${numParents} parents for re-import`)
  const html = exportContext(
    {
      ...stateStart,
      thoughts: {
        ...stateStart.thoughts,
        contextIndex: contextIndexRehashed,
      },
    },
    [HOME_TOKEN],
  )

  console.info(`Importing ${html.split('\n').length} new thoughts into current db`)
  const stateNew = importText(state, { text: html })
  return {
    state: stateNew,
    errors: {
      missingContexts,
    },
  }
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

  console.info('Converting legacy thoughts to modern schema')
  const thoughtsModern = convertLegacyThoughts(thoughtsCurrentRaw)

  console.info('Converting Parent children to proper arrays')
  const thoughtsCurrent = convertParentChildren(thoughtsModern)

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

      console.info('Converting legacy thoughts to modern schema')
      const thoughtsModern = convertLegacyThoughts(thoughtsImportedRaw)

      console.info('Converting Parent children to proper arrays')
      thoughtsImported = convertParentChildren(thoughtsModern)
    } catch (e) {
      console.error('Error reading')
      errors.push({ e: e as Error, file, message: 'Error reading' })
      return
    }

    try {
      const { state: stateImported, errors } = mergeThoughts(stateNew, thoughtsImported)
      stateNew = stateImported

      if (errors.missingContexts > 10) {
        console.warn('More than 10 Parents with missing context property:', errors.missingContexts)
      }

      // if we made it this far, there was no error
      success.push(file)
    } catch (e) {
      console.error('Error merging')
      errors.push({ e: e as Error, file, message: 'Error merging' })
      return
    }
  })

  console.info('')

  // write new state to output directory
  fs.mkdirSync('output', { recursive: true })

  // merge updated thoughts back into firebase db
  const dbNew = {
    ...thoughtsCurrent,
    contextIndex: stateNew.thoughts.contextIndex,
    thoughtIndex: stateNew.thoughts.thoughtIndex,
  }
  const fileNew = `output/${file1Base}-merged${file1Ext}`
  console.info(`Writing ${fileNew}`)
  fs.writeFileSync(fileNew, JSON.stringify(dbNew, null, 2))

  if (errors.length === 0) {
    console.info('Success!')
  } else {
    console.info('Writing error log')
    const debugOutput = errors.map(error => `${error.file}\n${error.message}\n${error.e.stack}`).join('\n')
    fs.writeFileSync('output/debug.log', debugOutput)

    console.info('Partial success! See output/debug.log for error messages and stack trace.')

    console.info('')
    console.info('Files that did get merged:')
    success.forEach(file => console.error(file))

    console.info('')
    console.info('Files that did not get merged:')
    errors.forEach(error => console.error(error.file))
  }
}

main()
