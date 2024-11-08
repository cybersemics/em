import Role from './Role'

type Routes = {
  share: {
    add: (args: { accessToken: string; docid: string; name?: string; role: Role }) => void
    delete: (args: { accessToken: string; docid: string }) => void
    update: (args: { accessToken: string; docid: string; name?: string; role: Role }) => void
  }
}

export default Routes
