import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import { isMobile } from '../browser.js'
import { store } from '../store.js'
import globals from '../globals.js'
import { handleGesture } from '../shortcuts.js'

// components
import { Children } from './Children.js'
import { Footer } from './Footer.js'
import { Helper } from './Helper.js'
import { HelperAutofocus } from './HelperAutofocus.js'
import { HelperContextView } from './HelperContextView.js'
import { HelperFeedback } from './HelperFeedback.js'
import { HelperHelp } from './HelperHelp.js'
import { HelperWelcome } from './HelperWelcome.js'
import { HomeLink } from './HomeLink.js'
import { MultiGesture } from './MultiGesture.js'
import { NavBar } from './NavBar.js'
import { Status } from './Status.js'
import { NewThoughtInstructions } from './NewThoughtInstructions.js'
import { Search } from './Search.js'
import { Tutorial } from './Tutorial.js'

// constants
import {
  HELPER_CLOSE_DURATION,
  RENDER_DELAY,
  TUTORIAL2_STEP_SUCCESS,
} from '../constants.js'

// util
import {
  cursorBack,
  canShowHelper,
  getChildrenWithRank,
  isTutorial,
  restoreSelection,
  translateContentIntoView,
} from '../util.js'

export const AppComponent = connect(({ dataNonce, focus, search, showContexts, user, settings, dragInProgress }) => ({ dataNonce,
  focus,
  search,
  showContexts,
  user,
  dragInProgress,
  dark: settings.dark,
  tutorialStep: settings.tutorialStep,
}))((
    { dataNonce, focus, search, showContexts, user, dragInProgress, dark, tutorialStep, dispatch }) => {

  const directChildren = getChildrenWithRank(focus)

  return <div ref={() => {
    document.body.classList[dark ? 'add' : 'remove']('dark')

    // set selection on desktop on load
    const { cursor } = store.getState()
    if (!isMobile && cursor && !window.getSelection().focusNode) {
      restoreSelection(cursor)
    }

    if (!globals.rendered) {
      translateContentIntoView(cursor, { scrollIntoViewOptions: { behavior: 'auto' } })
      globals.rendered = true
    }

  }} className={classNames({
    container: true,
    // mobile safari must be detected because empty and full bullet points in Helvetica Neue have different margins
    mobile: isMobile,
    'drag-in-progress': dragInProgress,
    chrome: /Chrome/.test(navigator.userAgent),
    safari: /Safari/.test(navigator.userAgent)
  })}><MultiGesture onEnd={handleGesture}>

    <HelperWelcome />
    <HelperHelp />
    <HelperFeedback />
    <Status />

    { // render as header on desktop
    !isMobile ? <NavBar position='top' /> : null}

    {isTutorial() ? <Tutorial /> : null}

    <div id='content' className={classNames({
      content: true,
      'content-tutorial': isTutorial() && tutorialStep !== TUTORIAL2_STEP_SUCCESS
    })} ref={el => {
      setTimeout(() => {
        // when the content initially loads, its transition duration for 'transform' is set to 0 so that the initial translateContentIntoView happens instantaneously.
        if (el) {
          el.style.transitionDuration = '0.75s'
        }
      }, RENDER_DELAY)
    }} onClick={() => {
      // remove the cursor if the click goes all the way through to the content
      // if disableOnFocus is true, the click came from an Editable onFocus event and we should not reset the cursor
      if (!globals.disableOnFocus) {
        const showHelper = store.getState().showHelper
        if (showHelper) {
          dispatch({ type: 'helperRemindMeLater', showHelper, HELPER_CLOSE_DURATION })
        }
        else {
          cursorBack()
          dispatch({ type: 'expandContextItem', itemsRanked: null })
        }
      }
    }}>

        {/* These helpers are connected to helperData. We cannot connect AppComponent to helperData because we do not want it to re-render when a helper is shown. */}
        <HelperAutofocus />
        <HelperContextView />

        { // only show suggestor if superscript helper is not completed/hidden
        canShowHelper('superscript') ? <Helper id='superscriptSuggestor' title="Just like in your mind, items can exist in multiple contexts in em." center>
          <p>For example, you may have "Todo" in both a "Work" context and a "Groceries" context.</p>
          <p><HomeLink inline /> allows you to easily view an item across multiple contexts without having to decide all the places it may go when it is first created.</p>
          <p><i>To see this in action, try entering an item that already exists in one context to a new context.</i></p>
        </Helper> : null}

      <div onClick={e => {
          // stop propagation to prevent default content onClick (which removes the cursor)
          e.stopPropagation()
        }}
      >

        {showContexts || directChildren.length === 0

          // context view
          // data-items must be embedded in each Context as Item since paths are different for each one
          ? <div className='content-container'>
            <Children
              focus={focus}
              itemsRanked={focus}
              expandable={true}
              showContexts={true}
            />

            <NewThoughtInstructions children={directChildren} />
          </div>

          // items (non-context view)
          : (() => {

            const children = (directChildren.length > 0
              ? directChildren
              : getChildrenWithRank(focus)
            )//.sort(sorter)

            // get a flat list of all grandchildren to determine if there is enough space to expand
            // const grandchildren = flatMap(children, child => getChildren(items.concat(child)))

            return <React.Fragment>
              {search != null ? <Search /> : <React.Fragment>
                <Children
                  focus={focus}
                  itemsRanked={focus}
                  expandable={true}
                />

                {children.length === 0 ? <NewThoughtInstructions children={directChildren} /> : null}
              </React.Fragment>}

            </React.Fragment>
          })()
        }
      </div>
    </div>

    { // render as footer on mobile
    isMobile ? <NavBar position='bottom' /> : null}
    <Footer />

    {/*<HelperIcon />*/}

  </MultiGesture></div>
})

