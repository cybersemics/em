import { Redis } from '@hocuspocus/extension-redis'
import { Server } from '@hocuspocus/server'
// eslint-disable-next-line fp/no-events
import { EventEmitter } from 'events'
import { MongodbPersistence } from 'y-mongodb-provider'
import * as Y from 'yjs'
import ThoughtspaceExtension from './ThoughtspaceExtension'
import bindState from './bindState'

// bump maxListeners to avoid warnings when many websocket connections are created
EventEmitter.defaultMaxListeners = 1000000

const mongodbConnectionString = process.env.MONGODB_CONNECTION_STRING ?? 'mongodb://localhost:27017'
const redisHost = process.env.REDIS_HOST
const redisPort = process.env.REDIS_PORT ? +process.env.REDIS_PORT : undefined
const port = process.env.PORT ? +process.env.PORT : 3001

const dbPermissions = new MongodbPersistence(mongodbConnectionString, { collectionName: 'yjs-permissions' })

// contains a top level map for each thoughtspace Map<Share> mapping token -> permission
const permissionsServerDoc = new Y.Doc()

const server = Server.configure({
  port,
  extensions: [
    ...(redisHost ? [new Redis({ host: redisHost, port: redisPort })] : []),
    new ThoughtspaceExtension({ connectionString: mongodbConnectionString, permissionsServerDoc }),
  ],
  onListen: async () => {
    // notify pm2 that the app is ready
    process.send?.('ready')
  },
})

// do not start server until permissions have synced
// otherwise owners could get overwritten
console.info('Loading permissions...')
const permissionsServerSynced = bindState({ db: dbPermissions, docName: 'permissions', doc: permissionsServerDoc })
permissionsServerSynced.then(() => {
  console.info('Permissions loaded')
  server.listen()
})
