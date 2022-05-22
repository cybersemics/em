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
import crypto from 'crypto'

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
import {
  Context,
  Index,
  Lexeme,
  SimplePath,
  State,
  Timestamp,
  Thought,
  ThoughtContext,
  ThoughtId,
  ThoughtIndices,
} from '../../src/@types'

/*************************************************************************
 * TYPES
 ************************************************************************/

interface Child {
  id: string
  lastUpdated: Timestamp
  rank: number
  value: string
}

// firebase stores arrays as objects
type FirebaseThought = Omit<Thought, 'children' | 'context'> & {
  children: Index<Child>
  context?: Index<string>
}

type FirebaseLexeme = Lexeme & {
  contexts: Index<ThoughtId>
}
interface FirebaseThoughtContext {
  context?: Index<string>
  lastUpdated?: string
  rank?: number
}

type FirebaseLexemeV3 = {
  lastUpdated: Timestamp
  memberOf: FirebaseThoughtContext[]
  value: string
}

type FirebaseLexemeV4 = Omit<Lexeme, 'contexts'> & {
  contexts?: Index<FirebaseThoughtContext>
}

interface FirebaseThoughtsV3 {
  contextIndex?: Index<FirebaseThought>
  contextChildren?: Index<FirebaseThought>
  data: Index<FirebaseLexemeV3>
}

interface FirebaseThoughtsV4 {
  // data can coexist with thoughtIndex (?)
  // See: 2020-01-05.json
  data: Index<FirebaseLexemeV3>
  contextIndex: Index<FirebaseThought>
  thoughtIndex: Index<FirebaseLexemeV4>
  schemaVersion?: number
}

interface FirebaseThoughtsV5 {
  thoughtIndex: Index<FirebaseThought>
  lexemeIndex: Index<FirebaseLexeme>
  schemaVersion?: number
}

type RawThoughts = FirebaseThoughtsV3 | FirebaseThoughtsV4 | FirebaseThoughtsV5 | ThoughtIndices | string[]

interface ErrorLog {
  e: Error
  file: string
  message: string
}

interface MergeResult {
  missingContexts: number
  schema: number
  thoughts: ThoughtIndices
}

interface ProgressReport {
  backupDate: string
  checksum: string
  date: string
  missingContexts: number
  path: string
  schema: number
  size: number
  lexemesBase: number
  lexemesSaved: number
  thoughtsBase: number
  thoughtsSaved: number
  thoughtsAdded: number
  time: number
}

interface Progress {
  backupsCompleted: ProgressReport[]
}

/*************************************************************************
 * CONSTANTS
 ************************************************************************/

const userId = 'm9S244ovF7fVrwpAoqoWxcz08s52'

const helpText = `Usage:
  node build/scripts/merge-dbs/index.js ~/em-backups/backups
`

const sessionId = createId()

let prevContext: Context = []

const stateStart = initialState()

/*****************************************************************
 * FUNCTIONS
 *****************************************************************/

/** Generates a checksum of string content. */
const checksum = (value: string) => crypto.createHash('sha256').update(value).digest('base64')

/** Gets the number of Lexemes in the State or Thoughts. */
const numLexemes = (stateOrThoughts: State | RawThoughts) => {
  const thoughts: RawThoughts = ((stateOrThoughts as State).thoughts as RawThoughts) || stateOrThoughts
  const lexemeIndex =
    (thoughts as FirebaseThoughtsV5).lexemeIndex ||
    (thoughts as FirebaseThoughtsV4).thoughtIndex ||
    (thoughts as FirebaseThoughtsV3).data ||
    {}
  return Object.keys(lexemeIndex).length
}

/** Gets the number of Thoughts in the State or Thoughts. */
const numThoughts = (stateOrThoughts: State | RawThoughts) => {
  const thoughts: RawThoughts = ((stateOrThoughts as State).thoughts as RawThoughts) || stateOrThoughts
  const thoughtIndex =
    (thoughts as FirebaseThoughtsV3).contextChildren ||
    (thoughts as FirebaseThoughtsV4).contextIndex ||
    (thoughts as FirebaseThoughtsV5).thoughtIndex ||
    {}
  return Object.keys(thoughtIndex).length
}

/** Read a thought database from file. */
const readThoughts = (file: string) => {
  const input = fs.readFileSync(file, 'utf-8')
  // if a file starts with a dash, interpret it as plain text
  // split the lines and pass as thoughts
  const db = input.startsWith('- ') ? input.split('\n') : JSON.parse(input)
  const rawThoughts = db.users?.[userId] || db
  const lastUpdated = (rawThoughts as any).lastUpdated

  return {
    lastUpdated,
    rawText: input,
    rawThoughts: rawThoughts as RawThoughts,
  }
}

/** Since the legacy contextIndex has no context property, it is impossible traverse the tree without the original hash function. Instead, recreate the contextIndex with new hashes from the thoughtIndex, which does have the context. Converts Firebase "arrays" to proper arrays. Leaves thoughtIndex as-is since it is not used to merge thoughts. */
const recreateParents = (thoughts: FirebaseThoughtsV4 | ThoughtIndices): ThoughtIndices => {
  const lexemes = Object.values(thoughts.thoughtIndex)
  console.info(`Recalculating context hash from ${chalk.blue(lexemes.length)} Lexemes`)

  const updatedBy = uid()

  return {
    thoughtIndex: {},
    lexemeIndex: {},
  }
}

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
const reconstructThought = (
  state: State,
  context: Context,
  {
    loose,
    rank,
    skipAncestors,
  }: {
    // Normalizes the head of the context before checking for existing contexts
    // Useful for reconstructing from Lexemes, because a Lexeme's value is normalized
    loose?: boolean
    // An optional rank that will override the thought's current rank if it exists. Otherwise a random rank is generated.
    rank?: number
    // If we know the ancestors exist, we can avoid unnecessary contextToPath calls.
    skipAncestors?: boolean
  } = {},
): State => {
  // check the existence of the full context immediately so that we can avoid recursion
  const path = contextToPath(state, context, { loose: true })
  if (path) {
    // override the rank in case the thought was originally created from a Parent with no rank
    if (rank !== undefined && !loose) {
      const thought = pathToThought(state, path)
      thought.rank = rank
    }
    return state
  }

  // reconstruct each ancestor and then the thought itself
  context.forEach((value, i) => {
    // skip ancestors for performance
    if (skipAncestors && i < context.length - 1) return

    const contextAncestor = context.slice(0, i + 1)

    // reuse the full path check from the beginning to avoid recursion
    const pathAncestor = i === context.length - 1 && !path ? null : contextToPath(state, contextAncestor)

    // reconstruct thought
    if (!pathAncestor) {
      state = createThought(state, contextAncestor, value, { rank })
    }
  })

  return state
}

/** Merges thoughts into current state using importText to handle duplicates and merged descendants. */
const mergeThoughts = (state: State, thoughts: RawThoughts): MergeResult => {
  /** Checks if the contextIndex uses the most up-to-date hashing function by checking the existence of the root context hash. This is NOT sufficient to determine if all Parents have a context property, which was added incrementally without a schemaVersion change. */
  // const isModernHash = (thoughts: FirebaseThoughtsV4) => '6f94eccb7b23a8040cd73b60ba7c5abf' in thoughts.contextIndex

  const t = time()
  let missingContexts = 0
  let schema: number

  // schema v5 (2022)
  if ('lexemeIndex' in thoughts) {
    schema = 5
    throw new Error(`Schema unsupported: v${schema}`)
  }

  // schema v3–4 (June 2020 – Dec 2021)
  // schema 2–3 (~Jan–May 2020)
  // V3 uses concatenated contexts as keys
  // v3 uses hashes
  schema =
    (thoughts as FirebaseThoughtsV4).schemaVersion ??
    ('data/__EMPTY__' in thoughts
      ? 1
      : '6f94eccb7b23a8040cd73b60ba7c5abf' in ((thoughts as FirebaseThoughtsV4).contextIndex ?? {})
      ? 4
      : 3)
  console.info(`Schema: v${schema}`)

  // reconstruct Thoughts from Parents
  Object.values(
    (thoughts as FirebaseThoughtsV4).contextIndex || (thoughts as FirebaseThoughtsV3).contextChildren || {},
  ).forEach(parent => {
    // this also skips contextIndex when it was Index<Child[]>, which has no context information
    if (!parent.context) {
      missingContexts++
      return
    }

    const context = Object.values(parent.context)
    state = reconstructThought(state, context)

    const children = Object.values(parent.children)
    children.forEach(child => {
      // unlike Parents, children actually have rank
      // we can skip ancestor reconstruction since the thought was reconstructed above
      state = reconstructThought(state, unroot([...context, child.value]), {
        rank: child.rank,
        skipAncestors: true,
      })
    })
  })

  // reconstruct Thoughts from Lexemes
  const thoughtIndex =
    schema === 1
      ? thoughts
      : (thoughts as FirebaseThoughtsV4).thoughtIndex || (thoughts as FirebaseThoughtsV3).data || []
  Object.values(thoughtIndex).forEach((lexeme: FirebaseLexemeV3 | FirebaseLexemeV4) => {
    const contexts = (lexeme as FirebaseLexemeV4)?.contexts || (lexeme as FirebaseLexemeV3)?.memberOf
    if (!contexts) {
      missingContexts++
      return
    }
    Object.values(contexts).forEach(cx => {
      // very old schemas can contain a bare array of contexts
      const thoughtContext = Array.isArray(cx) ? (cx as Context) : cx.context
      if (!thoughtContext) {
        missingContexts++
        return
      }
      const context = unroot([...Object.values(thoughtContext), lexeme.value])
      state = reconstructThought(state, context, { ...('rank' in cx ? { rank: cx.rank } : null), loose: true })
    })
  })

  // reconstruct Thoughts from Plaintext
  if (Array.isArray(thoughts) && typeof thoughts[0] === 'string') {
    const stack = [
      {
        context: [] as Context,
        nextRank: 100,
      },
    ]
    thoughts.forEach(line => {
      // thought may contain whitespace at end
      // don't let it mess up the depth calculation
      const trimmed = line.trimStart()
      const depth = (line.length - trimmed.length) / 2
      const depthPrev = stack.length - 2
      const depthDiff = depthPrev - depth
      const value = trimmed.slice(2).trimEnd()
      // cannot increase depth by more than 1
      if (depthDiff < -1) {
        console.error('depthPrev', depthPrev)
        console.error('depth', depth)
        console.error('stack', stack)
        throw new Error('Depth should only increase by 1')
      }
      for (let i = 0; i < depthDiff + 1; i++) {
        stack.pop()
      }
      const parent = stack[stack.length - 1]
      const next = {
        context: [...parent.context, value],
        nextRank: 100,
      }
      state = reconstructThought(state, next.context, { rank: parent.nextRank })
      parent.nextRank++
      stack.push(next)
    })
  }

  console.info(`Thoughts merged ${t.print()}`)
  if (missingContexts > 0) {
    console.info(`Missing contexts: ${chalk.cyan(missingContexts)}`)
  }

  return {
    missingContexts,
    schema,
    thoughts: state.thoughts,
  }
}

/** Loads a progress file and provides an API to add progress, save progress, or check if a backup has already been merged. */
const initProgress = (file: string) => {
  const progress: Progress = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { backupsCompleted: [] }
  // O(1) lookup by checksum

  const progressMap = progress.backupsCompleted.reduce(
    (accum, current) => ({
      ...accum,
      [current.checksum]: true,
    }),
    {} as Index<boolean>,
  )

  /** Adds a progress report and updates the checksum map. */
  const add = (progressReport: ProgressReport) => {
    progress.backupsCompleted.push(progressReport)
    progressMap[progressReport.checksum] = true
  }

  /** Returns true if a progress report with the given checksum exists. */
  const exists = (checksum: string) => progressMap[checksum]

  /** Saves the progress stats to the file. */
  const save = () => fs.writeFileSync(file, JSON.stringify(progress, null, 2))

  return {
    add,
    exists,
    save,
  }
}

const main = () => {
  const [, , dir] = process.argv

  // check args
  if (process.argv.length < 3) {
    console.info(helpText)
    process.exit(0)
  } else if (!fs.existsSync(`${dir}/db.json`)) {
    console.error(chalk.red('Missing db.json. Please save a base db with schema v5 to [DIR]/db.json.'))
    process.exit(1)
  }

  // read base thoughts
  // assume that they use schema v5
  const { lastUpdated, rawThoughts: thoughtsCurrent } = readThoughts(`${dir}/db.json`)

  console.info(`Thoughts read: ${chalk.cyan(numThoughts(thoughtsCurrent))}`)
  console.info(`Lexemes read: ${chalk.cyan(numLexemes(thoughtsCurrent))}`)
  console.info(`lastUpdated: ${lastUpdated ? new Date(lastUpdated).toString() : undefined}`)

  // read directory of backups to be imported
  const filesToImport = fs
    .readdirSync(dir)
    // skip progress file and hidden files including .DS_Store
    .filter(file => file !== 'db.json' && file !== 'progress.json' && file !== 'debug.log' && !file.startsWith('.'))
    .map(file => `${dir}/${file}`)

  console.info(`Files to import: ${filesToImport.length}`)

  // create a new state with the current thoughts
  let state: State = { ...stateStart, thoughts: thoughtsCurrent as ThoughtIndices }
  const errors: ErrorLog[] = []
  const success: string[] = []
  let skipped = 0
  let merged = 0

  const progress = initProgress(`${dir}/progress.json`)

  console.info('')
  filesToImport.forEach(file => {
    let thoughtsBackup: RawThoughts
    let lastUpdated: number
    let rawText: string

    const timeStart = time()

    // save the number of current thoughts before thoughtsCurrent gets modified
    const numThoughtsCurrent = numThoughts(thoughtsCurrent)
    const numLexemesCurrent = numLexemes(thoughtsCurrent)

    try {
      const readResult = readThoughts(file)

      lastUpdated = readResult.lastUpdated
      rawText = readResult.rawText
      thoughtsBackup = readResult.rawThoughts
    } catch (e) {
      console.error('Error reading')
      errors.push({ e: e as Error, file, message: 'Error reading' })
      console.info('')
      return
    }

    // skip files that have already been merged
    const backupChecksum = checksum(rawText)
    if (progress.exists(backupChecksum)) {
      skipped++
      return
    }

    console.info(`Thoughts read: ${chalk.cyan(numThoughts(thoughtsBackup))} ${timeStart.print()}`)
    console.info(`lastUpdated: ${lastUpdated ? new Date(lastUpdated).toString() : undefined}`)

    try {
      // replace state with merged thoughts
      const result = mergeThoughts(state, thoughtsBackup)

      // merge updated thoughts back into firebase db
      const dbNew = {
        ...thoughtsCurrent,
        thoughtIndex: result.thoughts.thoughtIndex,
        lexemeIndex: result.thoughts.lexemeIndex,
      }

      const timeWriteFile = time()

      // write new state to base db
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(`${dir}/db.json`, JSON.stringify(dbNew, null, 2))

      console.info(`Thoughts written ${timeWriteFile.print()}`)

      const thoughtsSaved = numThoughts(dbNew)

      const progressReport: ProgressReport = {
        checksum: backupChecksum,
        date: new Date().toString(),
        backupDate: new Date(lastUpdated).toString(),
        missingContexts: result.missingContexts,
        path: file,
        schema: result.schema,
        size: fs.statSync(`${dir}/db.json`).size / 1024000, // MB
        time: timeStart.measure(),
        lexemesBase: numLexemesCurrent,
        lexemesSaved: numLexemes(dbNew),
        thoughtsBase: numThoughtsCurrent,
        thoughtsSaved,
        thoughtsAdded: thoughtsSaved - numThoughtsCurrent,
      }

      progress.add(progressReport)
      progress.save()
      console.info('Progress saved', progressReport)

      merged++
      success.push(file)
    } catch (e) {
      console.error('Error merging')
      errors.push({ e: e as Error, file, message: 'Error merging' })
      console.info('')
      return
    }

    console.info('')
  })

  console.info(`Files skipped: ${chalk.cyan(skipped)}`)
  console.info(`Files merged: ${chalk.cyan(merged)}`)
  if (errors.length === 0) {
    console.info(chalk.green('SUCCESS'))
  } else {
    console.info('Writing error log')
    const debugOutput = errors.map(error => `${error.file}\n${error.message}\n${error.e.stack}`).join('\n')
    fs.writeFileSync(`${dir}/debug.log`, debugOutput)

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
      )}! See debug.log for error messages and stack trace.`,
    )
  }
}

main()
