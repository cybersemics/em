import { State } from '../@types'

/** Remove invitation code from store once user signed up. */
const setAuthLoader = (state: State, { value }: { value: boolean }) => ({
  ...state,
  isUserLoading: value,
})

export default setAuthLoader
