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
import { hashContext, hashThought, head, initialState, isRoot, unroot } from '../../src/util'
import { Child, Context, Index, Parent, State } from '../../src/@types'
import { exportContext, hasLexeme } from '../../src/selectors'
import { importText } from '../../src/reducers'

/*************************************************************************
 * TYPES
 ************************************************************************/

interface Database {
  users: Index<UserThoughts>
}

interface UserThoughts {
  thoughtIndex: State['thoughts']['thoughtIndex']
  contextIndex: State['thoughts']['contextIndex']
}

/*************************************************************************
 * CONSTANTS
 ************************************************************************/

const userId = 'm9S244ovF7fVrwpAoqoWxcz08s52'

const helpText = `Usage: node build/scripts/merge/index.js em-proto-current.json em-proto-backup.json\n\nOutputs contextIndex.json and thoughtIndex.json to ./output`

let prevContext: Context = []

const stateBlank = initialState()

/*****************************************************************
 * SCRIPT
 *****************************************************************/

/** Merges thoughts into current state using importText to handle duplicates and merged descendants. */
const mergeThoughts = (state: State, thoughts: UserThoughts) => {
  const html = exportContext({ ...stateBlank, thoughts: thoughts }, [HOME_TOKEN])
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
  const input1 = fs.readFileSync(file1, 'utf-8')
  const dbCurrent = JSON.parse(input1) as Database | UserThoughts
  const thoughtsCurrent = (dbCurrent as Database).users?.[userId] || (dbCurrent as UserThoughts)

  // read thoughts to be imported
  // this can be a directory or a file
  const filesToImport = fs.lstatSync(file2).isDirectory()
    ? fs.readdirSync(file2).map(file => `${file2}/${file}`)
    : [file2]

  // accumulate the new state by importing each input
  let stateNew = { ...stateBlank, thoughts: thoughtsCurrent }
  filesToImport.forEach(file => {
    // skip hidden files including .DS_Store
    if (path.basename(file).startsWith('.')) return
    console.info(`Reading thoughts to import: ${file}`)
    const input = fs.readFileSync(file, 'utf-8')
    const dbImport = JSON.parse(input) as Database | UserThoughts
    const thoughtsImported = (dbImport as Database).users?.[userId] || (dbImport as UserThoughts)
    console.info('Merging')
    stateNew = mergeThoughts(stateNew, thoughtsImported)
  })

  // write new contextIndex and thoughtIndex to output directory
  fs.mkdirSync('output', { recursive: true })

  const fileContextIndexOutput = `output/${file1Base}-contextIndex${file1Ext}`
  console.info(`Writing ${fileContextIndexOutput}`)
  fs.writeFileSync(fileContextIndexOutput, JSON.stringify(stateNew.thoughts.contextIndex, null, 2))

  const fileThoughtIndexOutput = `output/${file1Base}-thoughtIndex${file1Ext}`
  console.info(`Writing ${fileThoughtIndexOutput}`)
  fs.writeFileSync(fileThoughtIndexOutput, JSON.stringify(stateNew.thoughts.thoughtIndex, null, 2))

  console.info('Success!')
}

main()
