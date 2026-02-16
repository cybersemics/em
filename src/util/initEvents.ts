import _ from 'lodash'
import lifecycle from 'page-lifecycle'
import { Store } from 'redux'
import LifecycleState from '../@types/LifecycleState'
import Path from '../@types/Path'
import State from '../@types/State'
import { alertActionCreator as alert } from '../actions/alert'
import { commandPaletteActionCreator as commandPalette } from '../actions/commandPalette'
import { errorActionCreator as error } from '../actions/error'
import { gestureMenuActionCreator as gestureMenu } from '../actions/gestureMenu'
import { longPressActionCreator as longPress } from '../actions/longPress'
import { setCursorActionCreator as setCursor } from '../actions/setCursor'
import { isAndroidWebView, isIOS, isSafari, isTouch } from '../browser'
import { beforeInput, keyDown, keyUp } from '../commands'
import { AlertType, LongPressState } from '../constants'
import * as selection from '../device/selection'
import decodeThoughtsUrl from '../selectors/decodeThoughtsUrl'
import pathExists from '../selectors/pathExists'
import store from '../stores/app'
import { updateCommandState } from '../stores/commandStateStore'
import distractionFreeTypingStore from '../stores/distractionFreeTyping'
import { updateSafariKeyboardState } from '../stores/safariKeyboardStore'
import { updateScrollTop } from '../stores/scrollTop'
import selectionRangeStore from '../stores/selectionRangeStore'
import storageModel from '../stores/storageModel'
import syncStatusStore from '../stores/syncStatus'
import { updateSize } from '../stores/viewport'
import isRoot from '../util/isRoot'
import pathToContext from '../util/pathToContext'
import durations from './durations'
import equalPath from './equalPath'
import handleKeyboardVisibility from './handleKeyboardVisibility'

// the width of the scroll-at-edge zone at the top/bottom of the screen (for vertical scrolling) or left/right of the screen (for horizontal scrolling)
const TOOLBAR_SCROLLATEDGE_SIZE = 50
const WINDOW_SCROLLATEDGE_UP_SIZE = 120
const WINDOW_SCROLLATEDGE_DOWN_SIZE = 100

// the top speed of the scroll-at-edge expressed pixels per % of scroll-at-edge zone
const TOOLBAR_SCROLLATEDGE_SPEED = 1.25
const WINDOW_SCROLLATEDGE_SPEED = 2

/** How often to save the selection offset to storage when it changes. */
const SELECTION_CHANGE_THROTTLE = 200

// Store a timeout to determine if the device stays in the passive state.
// See: onStateChange
let passiveTimeout = 0

// cache the scroll-at-edge container on start for performance
// if the Sidebar is open on touch start, this is set to the .sidebar element
let scrollContainer: Window | HTMLElement = window

/** An scroll-at-edge function that will continue scrolling smoothly in a given direction until scroll-at-edge.stop is called. Takes a number of pixels to scroll each iteration. */
const scrollAtEdge = (() => {
  /** Cubic easing function. */
  const ease = (n: number) => Math.pow(n, 3)

  // if true, the window or scroll container will continue to be scrolled at the current rate without user interaction
  let autoscrolling = true

  // scroll speed (-1 to 1)
  const rate = { x: 0, y: 0 }

  /** Scroll vertically in the direction given by rate until stop is called. Defaults to scrolling the window, or you can pass an element to scroll. */
  const scroll = () => {
    const el = scrollContainer || window

    const scrollLeft = (scrollContainer as HTMLElement).scrollLeft ?? document.documentElement.scrollLeft
    const scrollLeftNew = Math.max(0, scrollLeft + rate.x)
    const scrollTop = (scrollContainer as HTMLElement).scrollTop ?? document.documentElement.scrollTop
    const scrollTopNew = Math.max(0, scrollTop + rate.y)

    // if we have hit the end, stop autoscrolling
    // i.e. if the next increment would not change scrollTop
    if (scrollLeftNew === scrollLeft && scrollTopNew === scrollTop) {
      autoscrolling = false
      return
    }

    el.scrollTo(scrollLeftNew, scrollTopNew)
    window.requestAnimationFrame(() => {
      if (autoscrolling) {
        scroll()
      }
    })
  }

  /** Starts the scroll-at-edge or, if already scrolling, updates the scroll rate (-1 to 1). */
  const start = ({ x, y }: { x?: number; y?: number }) => {
    // update the scroll rate
    if (x != null) {
      rate.x = ease(x ?? 1)
    }
    if (y != null) {
      rate.y = ease(y ?? 1)
    }

    // if already scrolling, just adjust the scroll rate and bail
    if (autoscrolling) return

    autoscrolling = true
    scroll()
  }

  /** Stops scrolling. */
  const stop = () => {
    autoscrolling = false
  }

  return { start, stop }
})()

/** Warns on close if saving is in progress. */
const onBeforeUnload = (e: BeforeUnloadEvent) => {
  const syncStatus = syncStatusStore.getState()
  if (
    syncStatus.savingProgress < 1 &&
    // do not warn user if importing, since it is resumable
    store.getState().alert?.alertType !== AlertType.ImportFile
  ) {
    // Note: Showing confirmation dialog can vary between browsers.
    // See: https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event
    e.preventDefault()
    e.returnValue = ''
    return ''
  }
}

/** Time to wait for save to complete. */
const SAVE_ERROR_TIME = 3000

/** Time to show error message before reload. */
const SAVE_ERROR_RELOAD_TIME = 3000

/** Save error timer id. */
let saveTimer: NodeJS.Timeout

/**
 * There is a known issue where saving gets stuck after and/redo and further edits are not saved.
 * If it takes longer than 3 seconds to save [to IndexedDB], then there is a major problem!
 * Show an error for three seconds then force a reload to prevent data loss.
 */
const saveErrorReload = (savingProgress: number) => {
  if (savingProgress === 1) {
    clearTimeout(saveTimer)
  }
  // Only set timer if one is not already running.
  // i.e. start timing from the first savingProgress < 1
  else if (!saveTimer) {
    saveTimer = setTimeout(() => {
      store.dispatch(error({ value: 'Save error detected. Reloading to prevent data loss...' }))
      setTimeout(() => {
        // remove onBeforeUnload listener to prevent the confirmation dialog and force a reload
        window.removeEventListener('beforeunload', onBeforeUnload)
        window.location.reload()
      }, SAVE_ERROR_RELOAD_TIME)
    }, SAVE_ERROR_TIME)
  }
}

/** Add window event handlers. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const initEvents = (store: Store<State, any>) => {
  let lastState: number
  let lastPath: Path | null

  /** Popstate event listener; setCursor on browser history forward/backward. */
  const onPopstate = (e: PopStateEvent) => {
    const state = store.getState()

    const { path, contextViews } = decodeThoughtsUrl(state)

    if (!lastPath) {
      lastPath = state.cursor
    }

    if (!path || !pathExists(state, pathToContext(state, path)) || equalPath(lastPath, path)) {
      window.history[!lastState || lastState > e.state ? 'back' : 'forward']()
    }

    lastPath = path && pathExists(state, pathToContext(state, path)) ? path : lastPath
    lastState = e.state

    const toRoot = !path || isRoot(path)

    // clear the selection if root
    if (toRoot) {
      selection.clear()
    }

    // set the cursor
    const cursor = toRoot ? null : path

    // check if path is the root, since decodeThoughtsUrl returns a rooted path rather than null
    store.dispatch(setCursor({ path: cursor, replaceContextViews: contextViews }))
  }

  /** Save selection offset to storage, throttled. */
  const saveSelectionOffset = _.throttle(
    () => {
      // editables are not long-pressable on desktop, so the range will only be a concern on mobile
      if (isTouch) selectionRangeStore.update(!selection.isCollapsed())
      storageModel.set('cursor', value => ({
        path: value?.path || store.getState().cursor,
        offset: selection.offsetThought(),
      }))
    },
    SELECTION_CHANGE_THROTTLE,
    { leading: false },
  )

  /** Selection change event listener; save selection offset to storage, update command state store. */
  const onSelectionChange = () => {
    // save selection offset to storage, throttled
    saveSelectionOffset()

    // update command state store
    updateCommandState()

    if (isTouch && isSafari() && !isIOS) {
      updateSafariKeyboardState()
    }
  }

  /** MouseMove event listener. */
  const onMouseMove = _.debounce(
    () => distractionFreeTypingStore.update(false),
    durations.get('distractionFreeTypingThrottle'),
    {
      leading: true,
    },
  )

  /** Handles scroll-at-edge on drag near the edge of the screen on mobile. */
  // TOOD: Scroll-at-edge for desktop. mousemove is not propagated when drag-and-drop is activated. We may need to tap into canDrop.
  const onTouchMove = (e: TouchEvent) => {
    const state = store.getState()
    const target = e.target as HTMLElement

    if (state.dragCommand) {
      const x = e.touches[0].clientX
      if (x < TOOLBAR_SCROLLATEDGE_SIZE) {
        const rate = 1 + ((TOOLBAR_SCROLLATEDGE_SIZE - x) * TOOLBAR_SCROLLATEDGE_SPEED) / TOOLBAR_SCROLLATEDGE_SIZE
        scrollAtEdge.start({ x: -rate })
      }
      // start scrolling down when within 100px of the right edge of the screen
      else if (x > window.innerWidth - TOOLBAR_SCROLLATEDGE_SIZE) {
        const rate =
          1 +
          ((x - window.innerWidth + TOOLBAR_SCROLLATEDGE_SIZE) * TOOLBAR_SCROLLATEDGE_SPEED) / TOOLBAR_SCROLLATEDGE_SIZE
        scrollAtEdge.start({ x: rate })
      }
      // stop scrolling when not near the edge of the screen
      else {
        scrollAtEdge.stop()
      }
    }
    // do not scroll-at-edge when hovering over DropGutter component
    else if (
      state.longPress === LongPressState.DragInProgress &&
      !(state.alert?.alertType === AlertType.DeleteDropHint)
    ) {
      const y = e.touches[0].clientY
      scrollContainer = (target.closest('[data-scroll-at-edge]') as HTMLElement) || window

      // start scrolling up when within 120px of the top edge of the screen
      if (y < WINDOW_SCROLLATEDGE_UP_SIZE) {
        const rate = 1 + ((WINDOW_SCROLLATEDGE_UP_SIZE - y) * WINDOW_SCROLLATEDGE_SPEED) / WINDOW_SCROLLATEDGE_UP_SIZE
        scrollAtEdge.start({ y: -rate })
      }
      // start scrolling down when within 100px of the bottom edge of the screen
      else if (y > window.innerHeight - WINDOW_SCROLLATEDGE_DOWN_SIZE) {
        const rate =
          1 +
          ((y - window.innerHeight + WINDOW_SCROLLATEDGE_DOWN_SIZE) * WINDOW_SCROLLATEDGE_SPEED) /
            WINDOW_SCROLLATEDGE_DOWN_SIZE
        scrollAtEdge.start({ y: rate })
      }
      // stop scrolling when not near the edge of the screen
      else {
        scrollAtEdge.stop()
      }
    }
  }

  /** Stops the scroll-at-edge when dragging stops. */
  const onTouchEnd = () => {
    scrollAtEdge.stop()
  }

  /** Handle a page lifecycle state change, i.e. switching apps. */
  const onStateChange = ({ oldState, newState }: { oldState: LifecycleState; newState: LifecycleState }) => {
    clearTimeout(passiveTimeout)

    // dismiss the gesture alert on hide
    if (newState === 'hidden' || oldState === 'hidden') {
      const state = store.getState()
      if (state.alert?.alertType === AlertType.GestureHint) {
        store.dispatch(alert(null))
      }
      if (state.showCommandPalette) {
        store.dispatch(commandPalette())
      }
      if (state.showGestureMenu) {
        store.dispatch(gestureMenu())
      }
      // we could also persist unsaved data here
    }
    // If the app is backgounded while keyboard is open, then the keyboard will not open when switching back to the app, even when focusNode, document.activeElement, and visualViewport.height all indicate that the keyboard is open. Strangely, the app enters the 'passive' state after hidden -> passive -> active completes. The invalid state can be detected with document.hasFocus(). Since there is no way to force the app to be active when it is passive, then we do not bother trying to re-open the keyboard, and instead disable keyboard is open so that at least it matches what the user sees. Use a timeout to ensure that this is called only when the device stays in the passive state, not when it is moving from hidden -> passive -> active.
    // https://github.com/cybersemics/em/issues/1468
    else if (
      isTouch &&
      isSafari() &&
      oldState === 'active' &&
      newState === 'passive' &&
      document.activeElement &&
      !document.hasFocus()
    ) {
      passiveTimeout = setTimeout(selection.clear, 10) as unknown as number
    }
  }
  /** Drag leave handler for file drag-and-drop. Does not handle drag end. */
  const dragLeave = _.debounce(() => {
    store.dispatch((dispatch, getState) => {
      // e.dataTransfer.types is not available in dragLeave for some reason, so we check state.draggingFile
      const state = getState()
      if (state.draggingFile) {
        dispatch([alert(null), longPress({ value: LongPressState.Inactive })])
      }
    })
  }, 100)

  /** Drag enter handler for file drag-and-drop. Sets state.longPress to DragInProgress and state.draggingFile to true. */
  const dragEnter = (e: DragEvent) => {
    // dragEnter and dragLeave are called in alternating pairs as the user drags over nested elements: ENTER, LEAVE, ENTER, LEAVE, ENTER
    // In order to detect the end of dragging a file, we need to debounce the dragLeave event and cancel it if dragEnter occurs.
    // Inspired by: https://stackoverflow.com/questions/3144881/how-do-i-detect-a-html5-drag-event-entering-and-leaving-the-window-like-gmail-d

    const hasSelectionRange = selectionRangeStore.getState()
    if (hasSelectionRange) return

    setTimeout(() => {
      dragLeave.cancel()
    })
    if (e.dataTransfer?.types.includes('Files')) {
      store.dispatch([
        alert('Drop to import file'),
        longPress({ value: LongPressState.DragInProgress, draggingFile: true }),
      ])
    }
  }

  /** Drop handler for file drag-and-drop. */
  const drop = (e: DragEvent) => {
    if (e.dataTransfer?.types.includes('Files')) {
      // wait until the next tick so that the thought/subthought drop handler has a chance to be called before draggingFile is reset
      // See: DragAndDropThought and DragAndDropSubthoughts
      setTimeout(() => {
        store.dispatch([alert(null), longPress({ value: LongPressState.Inactive })])
      })
    }
  }

  // prevent browser from restoring the scroll position so that we can do it manually
  window.history.scrollRestoration = 'manual'

  document.addEventListener('selectionchange', onSelectionChange)
  window.addEventListener('beforeinput', beforeInput)
  window.addEventListener('keydown', keyDown)
  window.addEventListener('keyup', keyUp)
  window.addEventListener('popstate', onPopstate)
  window.addEventListener('mousemove', onMouseMove)
  // Note: touchstart may not be propagated after dragHold
  window.addEventListener('touchmove', onTouchMove)
  window.addEventListener('touchend', onTouchEnd)
  window.addEventListener('beforeunload', onBeforeUnload)
  window.addEventListener('scroll', updateScrollTop)
  window.addEventListener('dragenter', dragEnter)
  window.addEventListener('dragleave', dragLeave)
  window.addEventListener('drop', drop)

  const resizeHost = window.visualViewport || window
  resizeHost.addEventListener('resize', updateSize)

  // Add Visual Viewport resize listener for keyboard detection
  if (isTouch && isAndroidWebView() && window.visualViewport) {
    window.visualViewport.addEventListener('resize', handleKeyboardVisibility)

    // Force an immediate check in case keyboard is already visible
    handleKeyboardVisibility()
  }

  // clean up on app switch in PWA
  // https://github.com/cybersemics/em/issues/1030
  lifecycle.addEventListener('statechange', onStateChange)

  const unsubscribeSaveErrorReload = syncStatusStore.subscribeSelector(state => state.savingProgress, saveErrorReload)

  /** Remove window event handlers. */
  const cleanup = () => {
    unsubscribeSaveErrorReload()
    document.removeEventListener('selectionchange', onSelectionChange)
    window.removeEventListener('beforeinput', beforeInput)
    window.removeEventListener('keydown', keyDown)
    window.removeEventListener('keyup', keyUp)
    window.removeEventListener('popstate', onPopstate)
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('touchmove', onTouchMove)
    window.removeEventListener('touchend', onTouchEnd)
    window.removeEventListener('beforeunload', onBeforeUnload)
    window.removeEventListener('scroll', updateScrollTop)
    window.removeEventListener('dragenter', dragEnter)
    window.removeEventListener('dragleave', dragLeave)
    window.removeEventListener('drop', drop)
    lifecycle.removeEventListener('statechange', onStateChange)
    resizeHost.removeEventListener('resize', updateSize)

    // Remove Visual Viewport event listener
    if (isTouch && isAndroidWebView() && window.visualViewport) {
      window.visualViewport.removeEventListener('resize', handleKeyboardVisibility)
    }
  }

  // return input handlers as another way to remove them on cleanup
  return { keyDown, keyUp, cleanup }
}

/** Error event listener. This does not catch React errors. See the ErrorFallback component that is used in the error boundary of the App component. */
// const onError = (e: { message: string; error?: Error }) => {
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onError = (e: any) => {
  console.error({ message: e.message, code: e.code, errors: e.errors })
  if (e.error && 'stack' in e.error) {
    console.error(e.error.stack)
  }
  store.dispatch(error({ value: e.message }))
}

// error handler must be added immediately to catch auth errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', onError)
}

export default initEvents
