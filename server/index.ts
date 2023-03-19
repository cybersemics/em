import { Server } from '@hocuspocus/server'
import level from 'level'
import _ from 'lodash'
import { LeveldbPersistence } from 'y-leveldb'
import * as Y from 'yjs'
import Share from '../src/@types/Share'
import ThoughtId from '../src/@types/ThoughtId'
import {
  encodeLexemeDocumentName,
  encodePermissionsDocumentName,
  encodeThoughtDocumentName,
  parseDocumentName,
} from '../src/data-providers/yjs/documentNameEncoder'
import taskQueue from '../src/util/taskQueue'
import timestamp from '../src/util/timestamp'

type ConsoleMethod = 'log' | 'info' | 'warn' | 'error'

interface ReplicationResult {
  type: 'thought' | 'lexeme'
  id: ThoughtId | string
  // the delta index that is saved as the replication cursor to enable partial replication
  index: number
}

// action types for the doclog
// See: doclog
enum DocLogAction {
  Delete,
  Update,
}

const port = process.env.PORT ? +process.env.PORT : 8080

// contains a top level map for each thoughtspace Map<Share> mapping token -> permission
const permissionsServerDoc = new Y.Doc()

/** Shows the first n characters of a string and replaces the rest with an ellipsis. */
const mask = (s: string, n = 4) => `${s.slice(0, n)}...`

/** Gets a permissionsServerDoc by name that is synced by the server. */
const getYDoc = (name: string): Y.Doc | undefined => server.documents.get(name)

/** Make text gray in the console. */
const gray = (s: string) => `\x1B[90m${s}\x1b[0m`

/** Logs a message to the console with an ISO timestamp. Optionally takes a console method for its last argument. Defaults to info. */
const log = (...args: [...any, ...([ConsoleMethod] | [])]) => {
  // prepend timestamp
  if (process.env.LOG_TIMESTAMPS) {
    args = [gray(new Date().toISOString()), ...args]
  }
  // default to console.info
  // override the method by passing { method: 'error' } as the last argument
  let method: ConsoleMethod = 'info'
  const lastArg = args[args.length - 1]
  if (typeof lastArg === 'object' && Object.keys(lastArg).length === 1 && lastArg.method) {
    args = args.slice(0, -1)
    method = lastArg.method
  }

  // eslint-disable-next-line no-console
  console[method](...args)
}

// meta information about the doclog, mainly the thoughtReplicationCursor
let doclogMeta: level.LevelDB<string, number> | undefined
let ldbPermissions: LeveldbPersistence | undefined
let ldbThoughtspace: LeveldbPersistence | undefined

if (process.env.YPERMISSIONS) {
  ldbPermissions = new LeveldbPersistence(process.env.YPERMISSIONS)
}
if (process.env.YPERSISTENCE) {
  ldbThoughtspace = new LeveldbPersistence(process.env.YPERSISTENCE)
}
if (process.env.DB_DOCLOGMETA) {
  doclogMeta = level(process.env.DB_DOCLOGMETA, { valueEncoding: 'json' })
}

/** Syncs a doc with leveldb. */
const syncLevelDb = async ({ db, docName, doc }: { db: any; docName: string; doc: Y.Doc }) => {
  const docPersisted = await db.getYDoc(docName)
  const updates = Y.encodeStateAsUpdate(doc)
  db.storeUpdate(docName, updates)
  Y.applyUpdate(doc, Y.encodeStateAsUpdate(docPersisted))
  doc.on('update', update => {
    db.storeUpdate(docName, update)
  })
}

/** Authenticates a document request with the given access token. Handles Docs for Thoughts, Lexemes, and Permissions. Assigns the token as owner if it is a new document. Throws an error if the access token is not authorized. */
export const onAuthenticate = async ({ token, documentName }: { documentName: string; token: string }) => {
  const { tsid } = parseDocumentName(documentName)
  // the server-side permissions map
  // stores the permissions for all thoughtspaces as Map<Index<Share>> (indexed by tsid and access token)
  // only accessible on the server
  const permissionsServerMap = permissionsServerDoc.getMap<Share>(tsid)

  // if the document has no owner, automatically assign the current user as owner
  if (permissionsServerMap.size === 0) {
    log(`assigning owner ${mask(token)} to new thoughtspace ${tsid}`)
    permissionsServerMap.set(token, { accessed: timestamp(), created: timestamp(), name: 'Owner', role: 'owner' })
  }

  // authenicate existing owner
  // authenticate new documents
  if (permissionsServerMap.get(token)?.role !== 'owner') {
    throw new Error('Not authorized')
  }

  // passed forward as data.context to later hooks
  return { token }
}

/** Syncs permissions to permissionsClientDoc on load. The permissionsServerDoc cannot be exposed since it contains permissions for all thoughtspaces. This must be done in onLoadDocument when permissionsClientDoc has been created through the websocket connection. */
export const onLoadDocument = async ({
  context,
  document,
  documentName,
}: {
  context: { token: string }
  document: Y.Doc
  documentName: string
}) => {
  const { token } = context
  const { tsid, type } = parseDocumentName(documentName)
  const permissionsDocName = encodePermissionsDocumentName(tsid)
  const permissionsServerMap = permissionsServerDoc.getMap<Share>(tsid)
  const permission = permissionsServerMap.get(token)

  if (!permission || permission.role !== 'owner') return

  // Copy permissions from the server-side permissions doc to the client-side permission doc.
  // The server-side permissions doc keeps all permissions for all documents in memory.
  // The client-side permissions doc uses authentication and can be exposed to the client via websocket.
  // update last accessed time on auth
  permissionsServerMap.set(token, { ...permission, accessed: timestamp() })

  const permissionsClientDoc = getYDoc(permissionsDocName)
  if (!permissionsClientDoc) return

  const permissionsClientMap = permissionsClientDoc.getMap<Share>()

  // sync client permissions to server
  // TODO: Maybe we can 2-way sync only the updates for this tsid
  permissionsClientMap?.observe(e => {
    e.changes.keys.forEach((change, key) => {
      if (change.action === 'delete') {
        permissionsServerMap.delete(key)
      } else {
        permissionsServerMap.set(key, permissionsClientMap.get(key)!)
      }
    })
  })

  // copy server permissions to client
  permissionsServerMap.forEach((permission: Share, token: string) => {
    permissionsClientMap.set(token, permission)
  })

  if (ldbThoughtspace && type !== 'permissions') {
    syncLevelDb({ db: ldbThoughtspace, docName: documentName, doc: document })
  }

  if (type === 'doclog') {
    /** A task queue for background replication of thoughts and lexemes. Use .add() to queue a thought or lexeme for replication. Paused during push/pull. Initially paused and starts after the first pull. */
    const replicationQueue = taskQueue<ReplicationResult>({
      onLowStep: ({ index, value }) => {
        if (value.type === 'thought') {
          updateThoughtReplicationCursor(value.index)
        } else {
          updateLexemeReplicationCursor(value.index)
        }
      },
    })

    // thoughtObservationCursor marks the index of the last thought delta that has been observed
    // only needs to be stored in memory
    // used to recalculate the delta slice on multiple observe calls
    // presumably the initial slice up to the replication delta is adequate, but this can handle multiple observes until the replication delta has been reached
    let thoughtObservationCursor = 0
    let lexemeObservationCursor = 0
    let thoughtReplicationCursor = 0
    let lexemeReplicationCursor = 0

    // thoughtReplicationCursor marks the number of contiguous delta insertions that have been replicated
    // used to slice the doclog and only replicate new changes
    if (doclogMeta) {
      try {
        thoughtReplicationCursor = await doclogMeta.get(`${documentName}-thoughtReplicationCursor`)
        lexemeReplicationCursor = await doclogMeta.get(`${documentName}-lexemeReplicationCursor`)
      } catch (e) {
        // get will fail with "Key not found" the first time
        // ignore it replication cursors will be set in next replication
      }
    }

    const updateThoughtReplicationCursor = _.throttle(
      (index: number) => {
        thoughtReplicationCursor = index + 1
        doclogMeta?.put(`${documentName}-thoughtReplicationCursor`, index + 1)
      },
      100,
      { leading: false },
    )
    const updateLexemeReplicationCursor = _.throttle(
      (index: number) => {
        lexemeReplicationCursor = index + 1
        doclogMeta?.put(`${documentName}-lexemeReplicationCursor`, index + 1)
      },
      100,
      { leading: false },
    )

    const doclog = document
    const thoughtLog = doclog.getArray<[ThoughtId, DocLogAction]>('thoughtLog')
    const lexemeLog = doclog.getArray<[string, DocLogAction]>('lexemeLog')

    // Partial replication uses the doclog to avoid replicating the same thought or lexeme in the background on load.
    // Clocks across clients are not monotonic, so we can't slice by clock.
    // Decoding updates gives an array of items, but the target (i.e. thoughtLog or lexemeLog) is not accessible.
    // Therefore, observe the deltas and slice from the replication cursor.
    thoughtLog.observe(e => {
      if (e.transaction.origin === doclog.clientID) return
      const startIndex = thoughtReplicationCursor

      // since the doglogs are append-only, ids are only on .insert
      const deltasRaw: [ThoughtId, DocLogAction][] = e.changes.delta.flatMap(item => item.insert || [])

      // slice from the replication cursor (excluding thoughts that have already been sliced) in order to only replicate changed thoughts
      const deltas = deltasRaw.slice(startIndex - thoughtObservationCursor)

      // generate a map of ThoughtId with their last updated index so that we can ignore older updates to the same thought
      const replicated = new Map<ThoughtId, number>()
      deltas.forEach(([id], i) => replicated.set(id, i))

      const tasks = deltas.map(([id, action], i) => {
        // ignore older updates to the same thought
        if (i !== replicated.get(id)) return null

        // update or delete the thought
        return async (): Promise<ReplicationResult> => {
          if (action === DocLogAction.Delete) {
            await ldbThoughtspace?.clearDocument(encodeThoughtDocumentName(tsid, id))
          }

          return { type: 'thought', id, index: startIndex + i }
        }
      })

      replicationQueue.add(tasks)
      thoughtObservationCursor += deltasRaw.length
    })

    // See: thoughtLog.observe
    lexemeLog.observe(e => {
      if (e.transaction.origin === doclog.clientID) return
      const startIndex = lexemeReplicationCursor

      // since the doglogs are append-only, ids are only on .insert
      const deltasRaw: [string, DocLogAction][] = e.changes.delta.flatMap(item => item.insert || [])

      // slice from the replication cursor (excluding lexemes that have already been sliced) in order to only replicate changed lexemes
      // reverse the deltas so that we can mark lexemes as replicated from newest to oldest without an extra filter loop
      const deltas = deltasRaw.slice(startIndex - lexemeObservationCursor)

      // generate a map of Lexeme keys with their last updated index so that we can ignore older updates to the same lexeme
      const replicated = new Map<string, number>()
      deltas.forEach(([key], i) => replicated.set(key, i))

      const tasks = deltas.map(([key, action], i) => {
        // ignore older updates to the same lexeme
        if (i !== replicated.get(key)) return null

        // update or delete the lexeme
        return async (): Promise<ReplicationResult> => {
          if (action === DocLogAction.Delete) {
            await ldbThoughtspace?.clearDocument(encodeLexemeDocumentName(tsid, key))
          }

          return { type: 'lexeme', id: key, index: startIndex + i }
        }
      })

      replicationQueue.add(tasks)
      lexemeObservationCursor += deltasRaw.length
    })
  }
}

// persist permissions to YPERMISSIONS with leveldb
// TODO: encrypt
if (ldbPermissions) {
  syncLevelDb({ db: ldbPermissions, docName: 'permissions', doc: permissionsServerDoc })
}

const server = Server.configure({
  port,
  onAuthenticate,
  onLoadDocument,
})

server.listen()
