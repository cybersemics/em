import Timestamp from './Timestamp'

interface Log {
  created: Timestamp
  message: string
  stack?: any
}

export default Log
