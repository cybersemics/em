import { useSelector } from 'react-redux'
import State from '../@types/State'
import useBodyAttribute from './useBodyAttribute'

/** A hook that takes a Redux selector and calls useBodyAttribute to set an attribute on the body element to the value from the Redux state. */
const useBodyAttributeSelector = <T>(name: string, selector: (state: State) => T) => {
  const value = useSelector(selector)
  useBodyAttribute(name, String(value))
}

export default useBodyAttributeSelector
