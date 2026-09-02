import { nanoid } from 'nanoid'
import Routes from '../@types/Routes'
import Share from '../@types/Share'
import { alertActionCreator as alert } from '../actions/alert'
import { clearActionCreator } from '../actions/clear'
import store from '../stores/app'
import storage from '../util/storage'
import timestamp from '../util/timestamp'
import { permissionsStore, persistPermissions } from './permissionsStore'
import db from './thoughtspace'
import { accessTokenLocal } from './thoughtspaceSession'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const permissionsModel: { [key in keyof Routes['share']]: any } = {
  add: ({ name, role }: Pick<Share, 'name' | 'role'>) => {
    const accessToken = nanoid()
    permissionsStore.update({
      entries: {
        ...permissionsStore.getState().entries,
        [accessToken]: {
          created: timestamp(),
          name: name || '',
          role,
        },
      },
    })
    void persistPermissions()
    store.dispatch(alert(`Added ${name ? `"${name}"` : 'device'}`))
    return { accessToken }
  },
  delete: async (accessToken: string, { name }: { name?: string } = {}) => {
    const prev = permissionsStore.getState().entries
    const next = { ...prev }
    delete next[accessToken]
    permissionsStore.update({ entries: next })
    await persistPermissions()

    if (accessToken !== accessTokenLocal) {
      store.dispatch(alert(`Removed ${name ? `"${name}"` : 'device'}`))
    } else if (Object.keys(next).length > 1) {
      store.dispatch([clearActionCreator(), alert(`Removed this device from the thoughtspace`)])
    } else {
      storage.clear()
      await db.clear()
      store.dispatch(clearActionCreator())

      // TODO: Do a full reset without refreshing the page.
      window.location.reload()
    }
  },
  update: (accessToken: string, { name, role }: Share) => {
    const entries = permissionsStore.getState().entries
    const permission = entries[accessToken]!
    permissionsStore.update({
      entries: {
        ...entries,
        [accessToken]: {
          ...(permission || null),
          created: timestamp(),
          ...(name ? { name } : null),
          ...(role ? { role } : null),
        },
      },
    })
    void persistPermissions()
    store.dispatch(alert(`${name ? ` "${name}"` : 'Device '} updated`))
  },
}

export default permissionsModel
