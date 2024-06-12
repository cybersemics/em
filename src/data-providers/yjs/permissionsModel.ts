import { nanoid } from 'nanoid'
import Routes from '../../@types/Routes'
import Share from '../../@types/Share'
import { alertActionCreator as alert } from '../../actions/alert'
import { clearActionCreator } from '../../actions/clear'
import { accessTokenLocal } from '../../data-providers/yjs/index'
import { clear } from '../../data-providers/yjs/thoughtspace'
import store from '../../stores/app'
import storage from '../../util/storage'
import timestamp from '../../util/timestamp'
import { rxDB } from '../rxdb/thoughtspace'

// permissions model that waps permissionsClientDoc
const permissionsModel: { [key in keyof Routes['share']]: any } = {
  add: async ({ name, role }: Pick<Share, 'name' | 'role'>) => {
    try {
      const accessToken = nanoid()
      await rxDB.collections.permissions.insert({
        id: accessToken,
        created: timestamp(),
        name: name || '',
        role,
      })
      store.dispatch(alert(`Added ${name ? `"${name}"` : 'device'}`, { clearDelay: 2000 }))
      return { accessToken }
    } catch (error) {
      return { error }
    }
  },
  delete: async (accessToken: string, { name }: { name?: string } = {}) => {
    const permissionDoc = await rxDB.collections.permissions.findOne(accessToken).exec()
    permissionDoc?.remove()

    // removed other device
    if (accessToken !== accessTokenLocal) {
      store.dispatch(alert(`Removed ${name ? `"${name}"` : 'device'}`, { clearDelay: 2000 }))
    }
    // removed current device when there are others
    else if ((await rxDB.collections.permissions.count().exec()) > 1) {
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
  update: async (accessToken: string, { name, role }: Share) => {
    const permissionDoc = await rxDB.collections.permissions.findOne(accessToken).exec()

    permissionDoc?.incrementalModify(permission => {
      if (name) permission.name = name
      if (role) permission.role = role
      permission.created = timestamp()
      return permission
    })

    store.dispatch(alert(`${name ? ` "${name}"` : 'Device '} updated`, { clearDelay: 2000 }))
  },
}

export default permissionsModel
