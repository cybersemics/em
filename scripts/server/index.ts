import { Server } from '@hocuspocus/server'
import Share from '../../src/@types/Share'

const host = process.env.HOST || 'localhost'
const port = process.env.PORT ? +process.env.PORT : 8080

const server = Server.configure({
  port,
})

server.listen()
