import { Redis } from '@hocuspocus/extension-redis'
import { Server } from '@hocuspocus/server'
// eslint-disable-next-line fp/no-events
import { EventEmitter } from 'events'
import { LeveldbPersistence } from 'y-leveldb'
import * as Y from 'yjs'
import ThoughtspaceExtension, { bindState } from './ThoughtspaceExtension'

// bump maxListeners to avoid warnings when many websocket connections are created
EventEmitter.defaultMaxListeners = 1000000

const redisHost = process.env.REDIS_HOST
const redisPort = process.env.REDIS_PORT ? +process.env.REDIS_PORT : undefined

const port = process.env.PORT ? +process.env.PORT : 3001
// must match the db directory used in backup.sh and the clear npm script
const dbDir = process.env.DB_DIR || 'db'
const thoughtsDbBasePath = `${dbDir}/thoughts`
const doclogDbBasePath = `${dbDir}/doclogs`
const replicationCursorDbBasePath = `${dbDir}/replicationCursor`

const ldbPermissions = new LeveldbPersistence(`${dbDir}/permissions`)

// contains a top level map for each thoughtspace Map<Share> mapping token -> permission
const permissionsServerDoc = new Y.Doc()

const server = Server.configure({
  port,
  extensions: [
    ...(redisHost ? [new Redis({ host: redisHost, port: redisPort })] : []),
    new ThoughtspaceExtension({
      dbPathDoclog: doclogDbBasePath,
      dbPathThoughts: thoughtsDbBasePath,
      dbPathReplicationCursor: replicationCursorDbBasePath,
      permissionsServerDoc,
    }),
  ],
  onListen: async () => {
    // notify pm2 that the app is ready
    process.send?.('ready')
  },
})

// do not start server until permissions have synced
// otherwise owners could get overwritten
console.info('Loading permissions...')
const permissionsServerSynced = bindState({ db: ldbPermissions, docName: 'permissions', doc: permissionsServerDoc })
permissionsServerSynced.then(() => {
  console.info('Permissions loaded')
  server.listen()
})
