type Routes = {
  'share/add': (args: { accessToken: string; docid: string; name?: string; role: string }) => void
  'share/delete': (args: { accessToken: string; docid: string }) => void
  'share/update': (args: { accessToken: string; docid: string; name?: string; role: string }) => void
}

export default Routes
