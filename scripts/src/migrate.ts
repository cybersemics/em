import _ from 'lodash'
import { nanoid } from 'nanoid'
import Index from '../../src/@types/IndexType'
import Lexeme from '../../src/@types/Lexeme'
import Thought from '../../src/@types/Thought'
import ThoughtDb from '../../src/@types/ThoughtDb'
import ThoughtId from '../../src/@types/ThoughtId'
import Timestamp from '../../src/@types/Timestamp'
import keyValueBy from '../../src/util/keyValueBy.js'
import hashThought from '../lib/hashThought.js'
import normalizeThought from '../lib/normalizeThought.js'
import Database from './types/Database.js'
import FirebaseThought from './types/FirebaseThought'

const SCHEMA_LATEST = 8

type FirebaseThought6 = Omit<Thought, 'childrenMap'> & { childrenMap?: Index<ThoughtId> }
type FirebaseThought7 = Omit<ThoughtDb, 'children'> & { children?: Index<Thought> }
type FirebaseThought8 = FirebaseThought7

type FirebaseLexeme6 = {
  id?: string
  value: string
  contexts?: ThoughtId[]
  created: Timestamp
  lastUpdated: Timestamp
  updatedBy?: string
}
type FirebaseLexeme7 = FirebaseLexeme6
type FirebaseLexeme8 = {
  id?: string
  lemma: string
  contexts?: Index<true> // key is of type ThoughtId; Record type does not allow indexing.
  created: Timestamp
  lastUpdated: Timestamp
  updatedBy?: string
}

interface Database6 extends Database {
  email: string
  lastClientId: string
  lastUpdated: string
  lexemeIndex: Index<FirebaseLexeme6>
  schemaVersion: 6
  thoughtIndex: Index<FirebaseThought6>
}

interface Database7 extends Database {
  email: string
  lastClientId: string
  lastUpdated: string
  lexemeIndex: Index<FirebaseLexeme7>
  schemaVersion: 7
  thoughtIndex: Index<FirebaseThought7>
}

interface Database8 extends Database {
  email: string
  lastClientId: string
  lastUpdated: string
  lexemeIndex: Index<FirebaseLexeme8>
  schemaVersion: 8
  thoughtIndex: Index<FirebaseThought8>
}

type DatabaseLatest = Database8

/** Migrates a database with an unknown schema to the latest schema. Exits with an error message if migration is not possible. */
const migrate = (db: Database): DatabaseLatest => {
  // missing schemaVersion property in db
  if (!db.schemaVersion) {
    console.error(`schemaVersion is not ${db.schemaVersion}. No migration is possible.`)
    process.exit(1)
  }
  // higher than expected
  else if (db.schemaVersion > SCHEMA_LATEST) {
    console.error(
      `schemaVersion v${db.schemaVersion} is higher than the migration script's SCHEMA_LATEST v${SCHEMA_LATEST}. Add migrateVersion[${SCHEMA_LATEST}].`,
    )
    process.exit(1)
  }
  // no migration needed for SCHEMA_LATEST
  else if (db.schemaVersion === SCHEMA_LATEST) return db as DatabaseLatest
  // missing migration
  else if (!migrateVersion[db.schemaVersion]) {
    console.error(`Latest schema version is v${SCHEMA_LATEST}. No migration available from schema v${db.schemaVersion}`)
    process.exit(1)
  }

  // otherwise migrate one step and recurse

  console.info(`Migrating db with schema v${db.schemaVersion}`)
  return migrate(migrateVersion[db.schemaVersion](db as Database6))
}

/** A Record of migration functions. Each migrates a single version step, e.g. 6 -> 7. */
// TODO: Why can't we type db as Database here?
const migrateVersion: Record<number, (db: Database) => Database> = {
  // childrenMap converted to inline children
  6: (db6: Database6): Database7 => {
    const db7: Database7 = {
      ...db6,
      schemaVersion: 7,
    }
    Object.values(db6.thoughtIndex).forEach(thought => {
      // there may be missing children
      // since they are in childrenMap, all we have are ids, so we cannot reconstruct the children
      const children = Object.values(thought.childrenMap || {}).map(id => db6.thoughtIndex[id]) as (
        | Thought
        | undefined
      )[]
      db7.thoughtIndex[thought.id] = {
        ..._.omit(thought, 'childrenMap'),
        ...(children.length > 0
          ? {
              children: keyValueBy(children, child =>
                child
                  ? {
                      [child.id]: child,
                    }
                  : null,
              ),
            }
          : null),
      } as FirebaseThought7
    })

    return db7
  },

  // 1. Lexeme.value renamed to Lexeme.lemma
  // 2. Lexeme.contexts changed from array to object
  // 3. lexemeIndex re-keyed with new hashing function to differentiate =archive and =archive
  7: (db7: Database7): Database8 => {
    /** Converts FirebaseLexeme7 contexts to FirebaseLexeme8 contexts. */
    const convertContexts = (contexts?: ThoughtId[]): Record<ThoughtId, true> =>
      keyValueBy(contexts || [], id => ({ [id]: true }))

    const convertLexeme = (lexeme7: FirebaseLexeme7) => ({
      // rename value to lemma
      ..._.omit(lexeme7, 'value'),
      lemma: normalizeThought(lexeme7.value),
      // convert contexts from an array to object
      contexts: convertContexts(lexeme7.contexts),
    })

    /** Converts a Db7 lexemeIndex to a Db8 lexemeIndex. */
    const convertLexemeIndex = (key: string, lexeme7: FirebaseLexeme7) => ({
      [key]: convertLexeme(lexeme7),
    })

    const db8: Database8 = {
      ...db7,
      lexemeIndex: keyValueBy(db7.lexemeIndex, convertLexemeIndex),
      schemaVersion: 8,
    }

    // rehash lexemeIndex, then let the repair script put the Lexeme contexts into the correct Lexeme
    Object.entries(db7.lexemeIndex).forEach(([key, lexemeOld]) => {
      const lexemeNew = db8.lexemeIndex[key]
      const keyNew = hashThought(lexemeOld.value)
      if (keyNew !== key) {
        delete db8.lexemeIndex[key]
        db8.lexemeIndex[keyNew] = lexemeNew
      }
    })

    return db8
  },
} as Record<number, (db: Database) => Database>

export default migrate
