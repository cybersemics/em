import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import { isMobile, isAndroid } from '../browser.js'
import { store } from '../store.js'
import globals from '../globals.js'
import { handleGesture } from '../shortcuts.js'

// components
import { Subthoughts } from './Subthoughts.js'
import { ErrorMessage } from './ErrorMessage.js'
import { Footer } from './Footer.js'
import { ModalFeedback } from './ModalFeedback.js'
import { ModalHelp } from './ModalHelp.js'
import { ModalWelcome } from './ModalWelcome.js'
import { MultiGesture } from './MultiGesture.js'
import { NavBar } from './NavBar.js'
import { NewThoughtInstructions } from './NewThoughtInstructions.js'
import { Search } from './Search.js'
import { Status } from './Status.js'
import { Tutorial } from './Tutorial.js'

// constants
import {
  MODAL_CLOSE_DURATION,
  TUTORIAL2_STEP_SUCCESS,
} from '../constants.js'

// util
import {
  cursorBack,
  getThoughts,
  isTutorial,
  restoreSelection,
} from '../util.js'

export const AppComponent = connect(({ dataNonce, focus, search, showContexts, user, settings, dragInProgress, isLoading, showModal, scaleSize }) => ({ dataNonce,
  focus,
  search,
  showContexts,
  user,
  dragInProgress,
  dark: settings.dark,
  tutorialStep: settings.tutorialStep,
  isLoading,
  showModal,
  scaleSize
}))((
    { dataNonce, focus, search, showContexts, user, dragInProgress, dark, tutorialStep, isLoading, dispatch, showModal, scaleSize }) => {

  const directSubthoughts = getThoughts(focus)

  // remove the cursor if the click goes all the way through to the content
  // extends cursorBack with logic for closing modals
  const clickOnEmptySpace = () => {
    // if disableOnFocus is true, the click came from an Editable onFocus event and we should not reset the cursor
    if (!globals.disableOnFocus) {
      if (showModal) {
        dispatch({ type: 'modalRemindMeLater', showModal, MODAL_CLOSE_DURATION })
      }
      else {
        cursorBack()
        dispatch({ type: 'expandContextThought', thoughtsRanked: null })
      }
    }
  }

  return <div ref={() => {
    document.body.classList[dark ? 'add' : 'remove']('dark')

    // set selection on desktop on load
    const { cursor } = store.getState()
    if (!isMobile && cursor && !window.getSelection().focusNode) {
      restoreSelection(cursor)
    }

    if (!globals.rendered) {
      globals.rendered = true
    }

  }} className={classNames({
    container: true,
    // mobile safari must be detected because empty and full bullet points in Helvetica Neue have different margins
    mobile: isMobile,
    android: isAndroid,
    'drag-in-progress': dragInProgress,
    chrome: /Chrome/.test(navigator.userAgent),
    safari: /Safari/.test(navigator.userAgent)
  })}><MultiGesture onEnd={handleGesture}>

    <ModalWelcome />
    <ModalHelp />
    <ModalFeedback />
    <ErrorMessage />
    <Status />

    { // render as header on desktop
    !isMobile ? <NavBar position='top' /> : null}

    {isTutorial() && !isLoading ? <Tutorial /> : null}

    
      <div id='content' className={classNames({
        content: true,
        'content-tutorial': isMobile && isTutorial() && tutorialStep !== TUTORIAL2_STEP_SUCCESS
      })}
      onClick={clickOnEmptySpace}>
        <div className="transformContain" style={{
          transform: `scale(${scaleSize})`, 
          width: `${100*(1/scaleSize)}%`
        }}>

        <div onClick={e => {
            // stop propagation to prevent default content onClick (which removes the cursor)
            e.stopPropagation()
          }}
        >

          {showContexts || directSubthoughts.length === 0

            // context view
            // thoughtIndex-thoughts must be embedded in each Context as Thought since paths are different for each one
            ? <div className='content-container'>
              <Subthoughts
                focus={focus}
                thoughtsRanked={focus}
                expandable={true}
                showContexts={true}
              />

              <NewThoughtInstructions children={directSubthoughts} />
            </div>

            // thoughts (non-context view)
            : (() => {

              const children = (directSubthoughts.length > 0
                ? directSubthoughts
                : getThoughts(focus)
              ) // .sort(sorter)

              // get a flat list of all grandchildren to determine if there is enough space to expand
              // const grandchildren = flatMap(children, child => getThoughts(thoughts.concat(child)))

              return <React.Fragment>
                {search != null ? <Search /> : <React.Fragment>
                  <Subthoughts
                    focus={focus}
                    thoughtsRanked={focus}
                    expandable={true}
                  />

                  {children.length === 0 ? <NewThoughtInstructions children={directSubthoughts} /> : null}
                </React.Fragment>}

              </React.Fragment>
            })()
          }
        </div>
      </div>
    </div>

    { // render as footer on mobile
    isMobile ? <NavBar position='bottom' /> : null}
    <Footer />

  </MultiGesture></div>
})
