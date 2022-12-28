import Index from '../../@types/IndexType'
import Routes from '../../@types/Routes'
import Share from '../../@types/Share'
import alert from '../../action-creators/alert'
import clearActionCreator from '../../action-creators/clear'
import importText from '../../action-creators/importText'
import { EM_TOKEN, INITIAL_SETTINGS } from '../../constants'
import { accessTokenLocal, tsid, websocketProviderPermissions, ypermissionsDoc } from '../../data-providers/yjs/index'
import { clear } from '../../data-providers/yjs/thoughtspace'
import store from '../../stores/app'
import createId from '../../util/createId'
import never from '../../util/never'
import storage from '../../util/storage'

const yPermissions = ypermissionsDoc.getMap<Index<Share>>('permissions')

// websocket RPC for shares
const permissionsServer: { [key in keyof Routes['share']]: any } = {
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

export default permissionsServer
