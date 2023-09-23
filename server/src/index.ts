import { Redis } from '@hocuspocus/extension-redis'
import { Server } from '@hocuspocus/server'
// eslint-disable-next-line fp/no-events
import { EventEmitter } from 'events'
import ThoughtspaceExtension from './ThoughtspaceExtension'

// bump maxListeners to avoid warnings when many websocket connections are created
EventEmitter.defaultMaxListeners = 1000000

const mongodbConnectionString = process.env.MONGODB_CONNECTION_STRING ?? 'mongodb://localhost:27017'
const redisHost = process.env.REDIS_HOST
const redisPort = process.env.REDIS_PORT ? +process.env.REDIS_PORT : undefined
const port = process.env.PORT ? +process.env.PORT : 3001

const server = Server.configure({
  port,
  extensions: [
    ...(redisHost ? [new Redis({ host: redisHost, port: redisPort })] : []),
    new ThoughtspaceExtension({ connectionString: mongodbConnectionString }),
  ],
  onListen: async () => {
    // notify pm2 that the app is ready
    process.send?.('ready')
  },
})

server.listen()
