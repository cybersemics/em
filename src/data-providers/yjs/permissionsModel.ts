import { nanoid } from 'nanoid'
import Share from '../../@types/Share'
import { alertActionCreator as alert } from '../../actions/alert'
import { clearActionCreator } from '../../actions/clear'
import { accessTokenLocal } from '../../data-providers/yjs/index'
import { clear } from '../../data-providers/yjs/thoughtspace'
import store from '../../stores/app'
import storage from '../../util/storage'
import timestamp from '../../util/timestamp'

/** Interface between DB and permissionsModel. */
const permissionsAdapter = (() => {
  /** Gets all permissions from the db. Simple localStorage demo only; obviously you would not fetch the entire db like this in practice. */
  const getAll = () => JSON.parse(localStorage.permissions || '{}') as { [key: string]: Share }

  return {
    delete: (key: string) => {
      const permissions = getAll()
      delete permissions[key]
      localStorage.permissions = JSON.stringify(permissions)
    },
    update: (key: string, value: Share) => {
      const permissions = getAll()
      localStorage.permissions = JSON.stringify({
        ...permissions,
        [key]: value,
      })
    },
    size: () => {
      const permissions = getAll()
      return Object.keys(permissions).length
    },
    get: (key: string) => {
      const permissions = getAll()
      return permissions[key]
    },
    getAll,
  }
})()

/** Interface between permissionsModel and app. */
const permissionsModel = {
  add: ({ name, role }: Pick<Share, 'name' | 'role'>) => {
    const accessToken = nanoid()
    permissionsAdapter.update(accessToken, {
      created: timestamp(),
      name: name || '',
      role,
    })
    store.dispatch(alert(`Added ${name ? `"${name}"` : 'device'}`, { clearDelay: 2000 }))
    return { accessToken }
  },
  delete: (accessToken: string, { name }: { name?: string } = {}) => {
    permissionsAdapter.delete(accessToken)

    // removed other device
    if (accessToken !== accessTokenLocal) {
      store.dispatch(alert(`Removed ${name ? `"${name}"` : 'device'}`, { clearDelay: 2000 }))
    }
    // removed current device when there are others
    else if (permissionsAdapter.size() > 1) {
      store.dispatch([clearActionCreator(), alert(`Removed this device from the thoughtspace`, { clearDelay: 2000 })])
    }
    // remove last device
    else {
      storage.clear()
      clear()
      store.dispatch(clearActionCreator())

      // TODO: Do a full reset without refreshing the page.
      window.location.reload()
    }
  },
  update: (accessToken: string, { name, role }: Share) => {
    const permission = permissionsAdapter.get(accessToken)!
    permissionsAdapter.update(accessToken, {
      ...(permission || null),
      created: timestamp(),
      ...(name ? { name } : null),
      ...(role ? { role } : null),
    })
    store.dispatch(alert(`${name ? ` "${name}"` : 'Device '} updated`, { clearDelay: 2000 }))
  },
  usePermissions: () => permissionsAdapter.getAll(),
}

export default permissionsModel
