import Timestamp from './Timestamp'

interface Log {
  created: Timestamp
  message: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stack?: any
}

export default Log
