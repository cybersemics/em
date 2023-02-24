import { Server } from '@hocuspocus/server'
import * as Y from 'yjs'
import Share from '../../src/@types/Share'
import { parseDocumentName } from '../../src/data-providers/yjs/documentNameEncoder'

const host = process.env.HOST || 'localhost'
const port = process.env.PORT ? +process.env.PORT : 8080

// contains a token:Share map for each thoughtspace
const ydoc = new Y.Doc()

/** Shows the first n characters of a string and replaces the rest with an ellipsis. */
const mask = (s: string, n = 4) => `${s.slice(0, n)}...`

/** Gets a YDoc by name that is synced by the server. */
const getYDoc = (name: string): Y.Doc | undefined => server.documents.get(name)

/** Authenticates a document request with the given access token. Handles Docs for Thoughts, Lexemes, and Permissions. Assigns the token as owner if it is a new document. Throws an error if the access token is not authorized. */
export const authenticate = async ({ token, documentName }: { documentName: string; token: string }) => {
  // extract the tsid from the documentName
  // permissions docs are in the format `${tsid}/permissions`
  // thoughts docs are in the format `${tsid}/thought/${id}`
  // lexeme docs are in the format `${tsid}/lexeme/${key}`
  const tsid = parseDocumentName(documentName)
  const permissionsDocName = `${tsid}/permissions`
  // TODO: Is the document returned by getYDoc(permissonsDocName) fully synced?
  const permissionsDoc = getYDoc(permissionsDocName) || new Y.Doc({ guid: permissionsDocName })
  // the server-side permissions map
  // only accessible on the server
  const permissionsServer = ydoc.getMap<Share>(tsid)
  let permission = permissionsServer.get(token)

  // if the document has no owner, automatically assign the current user as owner
  if (permissionsServer.size === 0) {
    console.info(`assigning owner ${mask(token)} to new thoughtspace ${tsid}`)
    permission = { accessed: Date.now(), created: Date.now(), name: 'Owner', role: 'owner' }
    permissionsServer.set(token, permission)
  }

  // Copy permissions from the server-side permissions doc to the client-side permission doc.
  // The server-side permissions doc keeps all permissions for all documents into memory.
  // The client-side permissions doc uses authentication and can be exposed to the client via websocket.
  if (permission?.role === 'owner') {
    // update last accessed time on auth
    permissionsServer.set(token, { ...permission, accessed: Date.now() })
    const yPermissionsClient = permissionsDoc.getMap<Share>('permissions')
    permissionsServer.forEach((permission: Share, token: string) => {
      yPermissionsClient.set(token, permission)
    })
  }

  if (permission?.role !== 'owner') {
    throw new Error('Not authorized')
  }
}

const server = Server.configure({
  port,
  onAuthenticate: authenticate,
})

server.listen()
