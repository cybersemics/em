import { useEffect } from 'react'
import { useDispatch, useStore } from 'react-redux'
import { toggleHelpGenieActionCreator as toggleHelpGenie } from '../../actions/toggleHelpGenie'
import geniePerformanceStore, { genieOpacity } from './geniePerformanceStore'

/**
 * Lets the genie out, invisible, while `active`, so that it has started by the time a performance needs it. Starting the
 * genie means downloading its code the first time and creating its WebGL context, which takes long enough to stall
 * whatever is animating at that moment, so it is better done early, while little else is moving. Puts it back when
 * `active` ends, unless a performance has started in the meantime and taken the genie over; that performance puts it
 * back when it ends. Does nothing if the genie is already out.
 */
const useGenieWarmup = (active: boolean) => {
  const dispatch = useDispatch()
  const store = useStore()
  useEffect(() => {
    if (!active || store.getState().helpGenie.visible) return
    genieOpacity.set(0)
    geniePerformanceStore.update({ warm: true })
    dispatch(toggleHelpGenie({ value: true }))
    return () => {
      // A performance that started while the genie was warm has taken it over.
      if (!geniePerformanceStore.getState().warm) return
      geniePerformanceStore.update({ warm: false })
      genieOpacity.set(1)
      dispatch(toggleHelpGenie({ value: false }))
    }
  }, [active, dispatch, store])
}

export default useGenieWarmup
