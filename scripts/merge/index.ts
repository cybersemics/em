/*************************************************************************
 * MODULE IMPORTS
 ************************************************************************/

import fs from 'fs'
import path from 'path'
import _ from 'lodash'
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
import { hashContext, hashThought, head, initialState, isRoot, keyValueBy, unroot } from '../../src/util'
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
  users: Index<FirebaseThoughts>
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

interface ErrorLog {
  e: Error
  file: string
  message: string
}

/*************************************************************************
 * CONSTANTS
 ************************************************************************/

const userId = 'm9S244ovF7fVrwpAoqoWxcz08s52'

const helpText = `Usage: node build/scripts/merge/index.js em-proto-current.json em-proto-backup.json\n\nOutputs contextIndex.json and thoughtIndex.json to ./output`

let prevContext: Context = []

const stateStart = initialState()

/*****************************************************************
 * SCRIPT
 *****************************************************************/

/** Read a thought database from file and convert arrays that are stored in Firebase as objects to proper arrays. */
const readThoughts = (file: string): FirebaseThoughts => {
  const input = fs.readFileSync(file, 'utf-8')
  const db = JSON.parse(input) as Database | FirebaseThoughts
  return (db as Database).users?.[userId] || (db as FirebaseThoughts)
}

/** Reads thoughts that were exported from Firebase. Converts Parent children to proper arrays. */
const convertParentChildren = (thoughts: FirebaseThoughts): ThoughtIndices => {
  // if already converted, return as-is
  const firstParent = Object.values(thoughts.contextIndex)[0]
  const isConverted = Array.isArray(firstParent.children)
  if (isConverted) return thoughts as unknown as ThoughtIndices

  const contextIndex = keyValueBy(thoughts.contextIndex, (key, parent) => {
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
  const numParents = Object.keys(thoughts.contextIndex).length
  console.info(`Recalculating ${numParents} contextIndex hashes`)
  // recalculate contextIndex hashes
  // thoughtIndex is not used, so we don't have to rehash it
  const contextIndexRehashed = keyValueBy(thoughts.contextIndex, (key, parent) => {
    // there are some invalid Parents with missing context field
    if (!parent?.context) return {}

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

  console.info('Converting Parent children to proper arrays')
  const thoughtsCurrent = convertParentChildren(thoughtsCurrentRaw)

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
      console.info('Converting Parent children to proper arrays')
      thoughtsImported = convertParentChildren(thoughtsImportedRaw)
    } catch (e) {
      console.error('Error reading')
      errors.push({ e: e as Error, file, message: 'Error reading' })
      return
    }

    try {
      stateNew = mergeThoughts(stateNew, thoughtsImported)

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
