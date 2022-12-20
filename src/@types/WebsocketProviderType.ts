import { WebsocketProvider } from 'y-websocket-auth'
import Routes from './Routes'

export type WebsocketProviderType = Omit<WebsocketProvider, 'send'> & {
  send: <T extends keyof Routes>(args: { type: T } & Parameters<Routes[T]>[0]) => void
}

export default WebsocketProviderType
