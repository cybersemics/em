import _ from 'lodash'
import { useCallback, useEffect, useState } from 'react'
import { shallowEqual } from 'react-redux'
import { IndexeddbPersistence } from 'y-indexeddb'
import { WebsocketProvider } from 'y-websocket-auth'
import * as Y from 'yjs'
import Index from '../@types/IndexType'
import Lexeme from '../@types/Lexeme'
import OfflineStatus from '../@types/OfflineStatus'
import Routes from '../@types/Routes'
import Share from '../@types/Share'
import Thought from '../@types/Thought'
import ThoughtWithChildren from '../@types/ThoughtWithChildren'
import Timestamp from '../@types/Timestamp'
import alert from '../action-creators/alert'
import clearActionCreator from '../action-creators/clear'
import importText from '../action-creators/importText'
import modalComplete from '../action-creators/modalComplete'
import updateThoughtsActionCreator from '../action-creators/updateThoughts'
import { EM_TOKEN, HOME_TOKEN, INITIAL_SETTINGS } from '../constants'
import { getAllChildrenAsThoughts } from '../selectors/getChildren'
import store from '../stores/app'
import ministore from '../stores/ministore'
import { createChildrenMapFromThoughts } from '../util/createChildrenMap'
import createId from '../util/createId'
import groupObjectBy from '../util/groupObjectBy'
import initialState from '../util/initialState'
import keyValueBy from '../util/keyValueBy'
import never from '../util/never'
import storage from '../util/storage'
import { DataProvider } from './DataProvider'

type Status = 'connecting' | 'connected' | 'disconnected'
type RouteOp<T> = T extends `share/${infer U}` ? U : never
type WebsocketServerRPC = { [key in RouteOp<keyof Routes>]: any }

const host = process.env.REACT_APP_WEBSOCKET_HOST || 'localhost'
const port = process.env.REACT_APP_WEBSOCKET_PORT || 8080
const protocol = host === 'localhost' ? 'ws' : 'wss'
// public host must end with '/' or the websocket connection will not open
const websocketUrl = `${protocol}://${host}${host === 'localhost' || host.endsWith('/') ? '' : '/'}:${port}`

const ydoc = new Y.Doc()
const ydocLocal = new Y.Doc()

// Define a secret access token for this device.
// Used to authenticate a connection to the y-websocket server.
export const accessTokenLocal = storage.getItem('accessToken', () => createId())

// Define a unique tsid (thoughtspace id) that is used as the default yjs doc id.
// This can be shared with ?share={docId} when connected to a y-websocket server.
export const tsidLocal = storage.getItem('tsid', () => createId())

// access a shared document when the URL contains share=DOCID&
// otherwise use the tsid stored on the device
const tsidShared = new URLSearchParams(window.location.search).get('share')
const accessTokenShared = new URLSearchParams(window.location.search).get('auth')

export const tsid = tsidShared || tsidLocal
export const accessToken = accessTokenShared || accessTokenLocal

/*************************************
 * Permissions ydoc
 ************************************/

/** If there is more than one device, connects the thoughtspace Websocket provider. */
const connectThoughtspaceProvider = () => {
  if (yPermissions.size > 1) {
    websocketProviderThoughtspace.connect()
  }
}

const ypermissionsDoc = new Y.Doc()
const yPermissions = ypermissionsDoc.getMap<Index<Share>>('permissions')

const indexeddbProviderPermissions = new IndexeddbPersistence(tsid, ypermissionsDoc)
const websocketProviderPermissions = new WebsocketProvider(websocketUrl, `${tsid}/permissions`, ypermissionsDoc, {
  auth: accessToken,
})

indexeddbProviderPermissions.whenSynced.then(connectThoughtspaceProvider)
yPermissions.observe(connectThoughtspaceProvider)

/*************************************
 * Thoughtspace ydoc
 ************************************/

const yThoughtIndex = ydoc.getMap<ThoughtWithChildren>('thoughtIndex')
const yLexemeIndex = ydoc.getMap<Lexeme>('lexemeIndex')
const yHelpers = ydoc.getMap<string>('helpers')

const indexeddbProviderThoughtspace = new IndexeddbPersistence(tsid, ydoc)
indexeddbProviderThoughtspace.whenSynced.then(() => {
  offlineStatusStore.update('synced')
})

const websocketProviderThoughtspace = new WebsocketProvider(websocketUrl, tsid, ydoc, {
  auth: accessToken,
  // Do not auto connect. Connects in connectThoughtspaceProvider only when there is more than one device.
  connect: false,
})

// Subscribe to yjs thoughts and use as the source of truth.
// Apply yThoughtIndex and yLexemeIndex changes directly to state.
yThoughtIndex.observe(async e => {
  if (e.transaction.origin === ydoc.clientID) return
  const ids = Array.from(e.keysChanged.keys())
  const thoughts = await getThoughtsByIds(ids)
  const thoughtIndexUpdates = keyValueBy(ids, (id, i) => ({ [id]: thoughts[i] || null }))
  store.dispatch(
    updateThoughtsActionCreator({
      thoughtIndexUpdates,
      lexemeIndexUpdates: {},
      local: false,
      remote: false,
      repairCursor: true,
    }),
  )
})
yLexemeIndex.observe(async e => {
  if (e.transaction.origin === ydoc.clientID) return
  const ids = Array.from(e.keysChanged.keys())
  const lexemes = await getLexemesByIds(ids)
  const lexemeIndexUpdates = keyValueBy(ids, (id, i) => ({ [id]: lexemes[i] || null }))
  store.dispatch(
    updateThoughtsActionCreator({
      thoughtIndexUpdates: {},
      lexemeIndexUpdates,
      local: false,
      remote: false,
      repairCursor: true,
    }),
  )
})

/** If the local thoughtspace is empty, save the shared docid and accessToken locally, i.e. make them the default thoughtspace. */
if (tsidShared && accessTokenShared && tsidShared !== tsidLocal) {
  const websocketProviderLocal = new WebsocketProvider(websocketUrl, tsidLocal, ydocLocal, {
    auth: accessTokenLocal,
  })
  websocketProviderLocal.on('synced', (event: any) => {
    const yThoughtIndexLocal = ydocLocal.getMap<ThoughtWithChildren>('thoughtIndex')

    // The root thought is not always loaded when synced fires (???).
    // Delaying seems to fix this.
    // yThoughtIndexLocal.update will not be called with an empty thoughtspace.
    // If a false positive occurs, the old thoughtspace will be lost (!!!)
    // Maybe IndexedDB will help eliminate the possibility of a false positive?
    setTimeout(() => {
      const rootThought = yThoughtIndexLocal.get(HOME_TOKEN)
      const isEmptyThoughtspace = Object.keys(rootThought?.children || rootThought?.childrenMap || {}).length === 0
      if (isEmptyThoughtspace) {
        // save shared access token and tsid as default
        console.info('Setting shared thoughtspace as default')
        storage.setItem('accessToken', accessTokenShared)
        storage.setItem('tsid', tsidShared)

        // backup tsid and accessToken just in case there is a false positive
        storage.getItem('tsidBackup', tsidLocal)
        storage.getItem('accessTokenBackup', accessTokenLocal)

        // close the welcome modal
        store.dispatch(modalComplete('welcome'))

        // clear share params from URL without refreshing
        window.history.pushState({}, '', '/')
      }
    }, 400)
  })
}

// ydoc.on('update', (event, provider, doc, transaction) => {
//   console.info('update', { event, provider, doc, transaction })
// })

// yLexemeIndex.observe(event => {
//   console.info('lexemeIndex updated', yLexemeIndex.size)
// })

/** Atomically updates the thoughtIndex and lexemeIndex. */
export const updateThoughts = async (
  thoughtIndexUpdates: Index<ThoughtWithChildren | null>,
  lexemeIndexUpdates: Index<Lexeme | null>,
  schemaVersion: number,
) => {
  // group thought updates and deletes so that we can use the db bulk functions
  const { update: thoughtUpdates, delete: thoughtDeletes } = groupObjectBy(thoughtIndexUpdates, (id, thought) =>
    thought ? 'update' : 'delete',
  ) as {
    update?: Index<ThoughtWithChildren>
    delete?: Index<null>
  }

  // group lexeme updates and deletes so that we can use the db bulk functions
  const { update: lexemeUpdates, delete: lexemeDeletes } = groupObjectBy(lexemeIndexUpdates, (id, lexeme) =>
    lexeme ? 'update' : 'delete',
  ) as {
    update?: Index<Lexeme>
    delete?: Index<null>
  }

  ydoc.transact(() => {
    Object.entries(thoughtDeletes || {}).forEach(([id]) => {
      yThoughtIndex.delete(id)
    })

    Object.entries(lexemeDeletes || {}).forEach(([id]) => {
      yLexemeIndex.delete(id)
    })

    Object.entries(thoughtUpdates || {}).forEach(([id, thought]) => {
      yThoughtIndex.set(id, thought)
    })

    Object.entries(lexemeUpdates || {}).forEach(([id, lexeme]) => {
      yLexemeIndex.set(id, lexeme)
    })
  }, ydoc.clientID)
}

/** Clears all thoughts and lexemes from the db. */
export const clear = async () => {
  ydoc.transact(() => {
    yThoughtIndex.clear()
    yLexemeIndex.clear()

    // reset to initialState, otherwise a missing ROOT error will occur when yThoughtIndex.observe is triggered
    const state = initialState()
    const thoughWithChildrentUpdates = keyValueBy(state.thoughts.thoughtIndex, (id, thought) => {
      const children = getAllChildrenAsThoughts(state, thought.id)
      const hasPendingChildren = children.length < Object.keys(thought.childrenMap).length
      const thoughtWithChildren: ThoughtWithChildren = {
        ..._.pick(thought, ['id', 'lastUpdated', 'parentId', 'rank', 'updatedBy', 'value']),
        children: keyValueBy(children, child => ({
          [child.id]: _.pick(child, ['id', 'childrenMap', 'lastUpdated', 'parentId', 'rank', 'updatedBy', 'value']),
        })),
        // if any inline children are pending, persist childrenMap instead of children
        // otherwise empty children are persisted to local when replicating from remote
        ...(hasPendingChildren ? { childrenMap: thought.childrenMap } : null),
      }

      return { [id]: thoughtWithChildren }
    })

    Object.entries(thoughWithChildrentUpdates).forEach(([id, thought]) => yThoughtIndex.set(id, thought))
    Object.entries(state.thoughts.lexemeIndex).forEach(([key, lexeme]) => yLexemeIndex.set(key, lexeme))
  })
}

/** Gets a single lexeme from the lexemeIndex by its id. */
export const getLexemeById = async (id: string) => yLexemeIndex.get(id)

/** Gets multiple thoughts from the lexemeIndex by Lexeme id. */
export const getLexemesByIds = async (keys: string[]) => keys.map(key => yLexemeIndex.get(key))

/** Get a thought by id. */
export const getThoughtById = async (id: string): Promise<Thought | undefined> => {
  const thoughtWithChildren: ThoughtWithChildren | undefined = yThoughtIndex.get(id)
  return thoughtWithChildren
    ? ({
        ..._.omit(thoughtWithChildren, ['children']),
        childrenMap: {
          ...thoughtWithChildren.childrenMap,
          ...createChildrenMapFromThoughts(Object.values(thoughtWithChildren.children || {})),
        },
      } as Thought)
    : undefined
}

/** Get a thought and its children. O(1). */
export const getThoughtWithChildren = async (id: string): Promise<ThoughtWithChildren | undefined> =>
  yThoughtIndex.get(id)

/** Gets multiple contexts from the thoughtIndex by ids. O(n). */
export const getThoughtsByIds = async (ids: string[]): Promise<(Thought | undefined)[]> => {
  const thoughtsWithChildren: (ThoughtWithChildren | undefined)[] = ids.map(id => yThoughtIndex.get(id))
  return thoughtsWithChildren.map(thoughtWithChildren =>
    thoughtWithChildren
      ? ({
          ..._.omit(thoughtWithChildren, ['children']),
          childrenMap: createChildrenMapFromThoughts(Object.values(thoughtWithChildren.children || {})),
        } as Thought)
      : undefined,
  )
}

/** Persists the cursor. */
export const updateCursor = async (cursor: string | null) =>
  cursor ? yHelpers.set('cursor', cursor) : yHelpers.delete('cursor')

/** Deletes the cursor. */
export const deleteCursor = async () => yHelpers.delete('cursor')

/** Last updated. */
export const getLastUpdated = async () => yHelpers.get('lastUpdated')

/** Last updated. */
export const updateLastUpdated = async (lastUpdated: Timestamp) => yHelpers.set('lastUpdated', lastUpdated)

/** Deletes a single lexeme from the lexemeIndex by its id. Only used by deleteData. TODO: How to remove? */
export const deleteLexeme = async (id: string) => yLexemeIndex.delete(id)

const db: DataProvider = {
  clear,
  getLexemeById,
  getLexemesByIds,
  getThoughtById,
  getThoughtWithChildren,
  getThoughtsByIds,
  updateThoughts,
}

// websocket RPC for shares
export const shareServer: WebsocketServerRPC = {
  add: ({ name, role }: Pick<Share, 'name' | 'role'>) => {
    const accessToken = createId()
    websocketProviderPermissions.send({
      type: 'share/add',
      docid: tsid,
      accessToken,
      name: name || '',
      role,
    })
    // TODO: get success/fail result of share/add
    store.dispatch(alert(`Added ${name ? `"${name}"` : 'device'}`, { clearDelay: 2000 }))
    return { accessToken }
  },
  delete: (accessToken: string, { name }: { name?: string } = {}) => {
    websocketProviderPermissions.send({ type: 'share/delete', docid: tsid, accessToken })

    // removed other device
    if (accessToken !== accessTokenLocal) {
      store.dispatch(alert(`Removed ${name ? `"${name}"` : 'device'}`, { clearDelay: 2000 }))
    }
    // removed current device when there are others
    else if (yPermissions.size > 1) {
      store.dispatch([clearActionCreator(), alert(`Removed this device from the thoughtspace`, { clearDelay: 2000 })])
    }
    // remove last device
    else {
      storage.clear()
      clear()
      store.dispatch([
        clearActionCreator(),
        importText({
          path: [EM_TOKEN],
          text: INITIAL_SETTINGS,
          lastUpdated: never(),
          preventSetCursor: true,
        }),
      ])

      // TODO: Do a full reset without refreshing the page.
      window.location.reload()
    }
  },
  update: (accessToken: string, { name, role }: Share) => {
    websocketProviderPermissions.send({ type: 'share/update', docid: tsid, accessToken, name, role })
    store.dispatch(alert(`${name ? ` "${name}"` : 'Device '} updated`, { clearDelay: 2000 }))
  },
}

// Infer the generic type of a specific YEvent such as YMapEvent or YArrayEvent
// This is needed because YEvent is not generic.
type ExtractYEvent<T> = T extends Y.YMapEvent<infer U> | Y.YArrayEvent<infer U> ? U : never

/** Subscribes to a yjs shared type, e.g. Y.Map. Performs shallow comparison between new and old state and only updates if shallow value has changed. */
export const useSharedType = <T>(yobj: Y.AbstractType<T>): ExtractYEvent<T> => {
  const [state, setState] = useState<ExtractYEvent<T>>(yobj.toJSON())

  const updateState = useCallback(async e => {
    const stateNew: Index<Share> = yobj.toJSON()
    setState((stateOld: any) => (!shallowEqual(stateNew, stateOld) ? stateNew : stateOld))
  }, [])

  useEffect(() => {
    yobj.observe(updateState)
    return () => {
      yobj.unobserve(updateState)
    }
  })

  return state
}

/** A hook that subscribes to yPermissions. */
export const usePermissions = () => useSharedType(yPermissions)

/** A hook that subscribes to the permissions WebsocketProvider's connection status. Uses the permissions instead of thoughtspace provider since the thoughtspace provider is only connected if the thoughtspace is shared with more than one device. */
export const useStatus = () => {
  const [state, setState] = useState<Status>(websocketProviderPermissions.wsconnected ? 'connected' : 'disconnected')

  const updateState = useCallback((e: { status: Status }) => setState(e.status), [])

  useEffect(() => {
    websocketProviderPermissions.on('status', updateState)
    return () => {
      websocketProviderPermissions.off('status', updateState)
    }
  })

  return state
}

/** A store that tracks a derived websocket connection status that includes special statuses for initialization (preconnecting), the first connection attempt (connecting), and offline mode (offline). See: OfflineStatus. */
export const offlineStatusStore = ministore<OfflineStatus>(
  websocketProviderPermissions.wsconnected ? 'connected' : 'preconnecting',
)

websocketProviderPermissions.on('status', (e: { status: Status }) => {
  offlineStatusStore.update(statusOld =>
    e.status === 'connecting'
      ? // preconnecting/connecting/offline (no change)
        statusOld === 'preconnecting' || statusOld === 'connecting' || statusOld === 'offline'
        ? statusOld
        : 'reconnecting'
      : // connected (stop reconnecting)
      e.status === 'connected'
      ? // Stay preconnecting when the provider becomes connected and wait for synced.
        // Otherwise the loading indicator will flash.
        (stopConnecting(), statusOld === 'preconnecting' ? 'preconnecting' : 'connected')
      : // disconnecting (start reconnecting)
      e.status === 'disconnected'
      ? (startConnecting(), 'reconnecting')
      : (new Error('Unknown connection status: ' + e.status), statusOld),
  )
})
websocketProviderThoughtspace.on('synced', () => {
  stopConnecting()
  offlineStatusStore.update('synced')
})

/** Enter a connecting state and then switch to offline after a delay. */
const startConnecting = (delay = 3000) => {
  stopConnecting()
  offlineStatusStore.update('connecting')
  offlineTimer = setTimeout(() => {
    offlineTimer = null
    offlineStatusStore.update('offline')
  }, delay)
}

/** Clears the preconnecting and offline timers, indicating either that we have connected to the websocket server, or have entered offline mode as the client continues connecting in the background. */
const stopConnecting = () => {
  clearTimeout(offlineTimer!)
  offlineTimer = null
}

let offlineTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => startConnecting(), 500)

export default db
