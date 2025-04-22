// import { WebsocketProvider } from 'y-websocket-auth'
import Routes from './Routes'

// override the WebsocketProvider type with properly typed send method
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WebsocketProviderType = Omit</* WebsocketProvider */ any, 'send'> & {
  send: <T extends keyof Routes['share']>(args: { type: `share/${T}` } & Parameters<Routes['share'][T]>[0]) => void
}

export default WebsocketProviderType
