import assert from 'assert'
import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { isMobile, isMac } from '../browser.js'

// constants
import {
  EM_TOKEN,
  ROOT_TOKEN,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_FIRSTTHOUGHT_ENTER,
  TUTORIAL_STEP_SECONDTHOUGHT,
  TUTORIAL_STEP_SECONDTHOUGHT_HINT,
  TUTORIAL_STEP_SECONDTHOUGHT_ENTER,
  TUTORIAL_STEP_SUBTHOUGHT,
  TUTORIAL_STEP_SUBTHOUGHT_ENTER,
  TUTORIAL_STEP_AUTOEXPAND,
  TUTORIAL_STEP_AUTOEXPAND_EXPAND,
  TUTORIAL_STEP_SUCCESS,
  TUTORIAL2_STEP_START,
  TUTORIAL2_STEP_CHOOSE,
  TUTORIAL2_STEP_CONTEXT1_PARENT,
  TUTORIAL2_STEP_CONTEXT1_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT1,
  TUTORIAL2_STEP_CONTEXT1_HINT,
  TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT,
  TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT,
  TUTORIAL2_STEP_CONTEXT2_PARENT,
  TUTORIAL2_STEP_CONTEXT2_PARENT_HINT,
  TUTORIAL2_STEP_CONTEXT2,
  TUTORIAL2_STEP_CONTEXT2_HINT,
  TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT,
  TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT,
  TUTORIAL2_STEP_CONTEXT_VIEW_SELECT,
  TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE,
  TUTORIAL2_STEP_CONTEXT_VIEW_OPEN,
  TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES,
  TUTORIAL2_STEP_SUCCESS,
  TUTORIAL_VERSION_TODO,
  TUTORIAL_VERSION_JOURNAL,
  TUTORIAL_VERSION_BOOK,
  TUTORIAL_CONTEXT,
  TUTORIAL_CONTEXT1_PARENT,
  TUTORIAL_CONTEXT2_PARENT,
} from '../constants.js'

import {
  tutorialNext,
  tutorialPrev,
  isHint,
} from '../action-creators/tutorial.js'

import {
  formatKeyboardShortcut,
  shortcutById,
} from '../shortcuts.js'

import {
  contextOf,
  ellipsize,
  getContexts,
  getThoughtsRanked,
  hashContext,
  head,
  headValue,
  isRoot,
  joinConjunction,
  meta,
  pathToContext,
} from '../util.js'

// components
import { GestureDiagram } from './GestureDiagram.js'
import { StaticSuperscript } from './StaticSuperscript.js'
import { TutorialHint } from './TutorialHint.js'

// assert shortcut at load time
const newThoughtShortcut = shortcutById('newThought')
assert(newThoughtShortcut)

// returns true if the first context thought has been created, e.g. /Home/To Do/x
const context1SubthoughtCreated = ({ rootSubthoughts, tutorialChoice }) =>
  // e.g. Home
  rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) &&
  // e.g. Home/To Do
  getThoughtsRanked([TUTORIAL_CONTEXT1_PARENT[tutorialChoice]]).find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()) &&
  // e.g. Home/To Do/x
  getThoughtsRanked([TUTORIAL_CONTEXT1_PARENT[tutorialChoice], TUTORIAL_CONTEXT[tutorialChoice]]).length > 0

// returns true if the first context thought has been created, e.g. /Work/To Do/y
const context2SubthoughtCreated = ({ rootSubthoughts, tutorialChoice }) =>
  // e.g. Work
  rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase()) &&
  // e.g. Work/To Do
  getThoughtsRanked([TUTORIAL_CONTEXT2_PARENT[tutorialChoice]]).find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()) &&
  // e.g. Work/To Do/y
  getThoughtsRanked([TUTORIAL_CONTEXT2_PARENT[tutorialChoice], TUTORIAL_CONTEXT[tutorialChoice]]).length > 0

const TutorialNext = connect(({ contextIndex, cursor, expanded = {} }) => ({ contextIndex, cursor, expanded, tutorialChoice: Object.keys(meta([EM_TOKEN, 'Settings', 'Tutorial Choice']) || {})[0] || 0, tutorialStep: Object.keys(meta([EM_TOKEN, 'Settings', 'Tutorial Step']) || {})[0] || 0 }))(({ contextIndex, cursor, expanded, tutorialChoice, tutorialStep }) => {

  const rootSubthoughts = contextIndex[hashContext([ROOT_TOKEN])] || []
  return [
    TUTORIAL_STEP_START,
    TUTORIAL_STEP_SUCCESS,
    TUTORIAL2_STEP_START,
    TUTORIAL2_STEP_CONTEXT_VIEW_OPEN,
    TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES,
    TUTORIAL2_STEP_SUCCESS,
  ].includes(tutorialStep) ||
    (tutorialStep === TUTORIAL_STEP_AUTOEXPAND && Object.keys(expanded).length === 0) ||
    ((tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT_ENTER ||
      tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_ENTER ||
      tutorialStep === TUTORIAL_STEP_SUBTHOUGHT_ENTER
      ) && (!cursor || headValue(cursor).length > 0)) ||
    (Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT && context1SubthoughtCreated({ rootSubthoughts, tutorialChoice })) ||
    (Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT && context2SubthoughtCreated({ rootSubthoughts, tutorialChoice }))
    ? <a className='tutorial-button button button-variable-width' onClick={tutorialNext}>{tutorialStep === TUTORIAL_STEP_SUCCESS || tutorialStep === TUTORIAL2_STEP_SUCCESS ? 'Finish' : 'Next'}</a>
    : <span className='tutorial-next-wait text-small'>Complete the instructions to continue</span>
})

const TutorialPrev = ({ tutorialStep }) => <a className={classNames({
  'tutorial-prev': true,
  button: true,
  'button-variable-width': true
})} disabled={tutorialStep === TUTORIAL_STEP_START} onClick={() => tutorialPrev(tutorialStep)}>Prev</a>

export const Tutorial = connect(({ contextIndex, contextViews, cursor, thoughtIndex }) => ({ contextIndex, contextViews, cursor, thoughtIndex, tutorialChoice: Object.keys(meta([EM_TOKEN, 'Settings', 'Tutorial Choice']) || {})[0] || 0, tutorialStep: Object.keys(meta([EM_TOKEN, 'Settings', 'Tutorial Step']) || {})[0] || 1 }))(({ contextIndex, contextViews, cursor, thoughtIndex, tutorialChoice, tutorialStep, dispatch }) => {

  const rootSubthoughts = contextIndex[hashContext([ROOT_TOKEN])] || []

  // a thought in the root that is not the cursor
  const rootSubthoughtNotCursor = () => cursor
    ? rootSubthoughts.find(child => pathToContext(cursor).indexOf(child.value) === -1)
    : getThoughtsRanked([rootSubthoughts[0]]).length > 0 ? rootSubthoughts[1] : rootSubthoughts[0]

  // a thought in the root that is not the cursor and has children
  const rootSubthoughtNotCursorWithSubthoughts = () =>
    rootSubthoughts.find(child =>
      (!cursor || pathToContext(cursor).indexOf(child.value) === -1) &&
      getThoughtsRanked([child]).length > 0
    )

  // a child of a thought in the root that is not the cursor
  const rootGrandchildNotCursor = () => {
    const uncle = rootSubthoughtNotCursorWithSubthoughts()
    return uncle ? getThoughtsRanked([uncle])[0] : null
  }

  return <div className='tutorial'><div className='tutorial-inner'>
    <a className='upper-right tutorial-skip text-small' style={{ visibility: tutorialStep !== TUTORIAL_STEP_SUCCESS && tutorialStep !== TUTORIAL2_STEP_SUCCESS ? 'visible' : 'hidden' }} onClick={() => dispatch({ type: 'tutorial', value: false })}>✕ close tutorial</a>
    <div className='clear'>
      <div className='tutorial-text'>
      <TransitionGroup>
      {{

        [TUTORIAL_STEP_START]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>Welcome to your personal thoughtspace.</p>
          <p>Don't worry. I will walk you through everything you need to know.</p>
          <p>Let's begin...</p>
        </div></CSSTransition>,

        [TUTORIAL_STEP_FIRSTTHOUGHT]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>First, let me show you how to create a new thought in <b>em</b> using a {isMobile ? 'gesture' : 'keyboard shortcut'}. Just follow the instructions; this tutorial will stay open.</p>
          <p>{isMobile ? 'Trace the line below with your finger' : 'Hit the Enter key'} to create a new thought.</p>
        </div></CSSTransition>,

        [TUTORIAL_STEP_FIRSTTHOUGHT_ENTER]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>You did it!</p>
          {!cursor || headValue(cursor).length > 0 ? <p>{isMobile ? 'Tap' : 'Click'} the Next button when you are done entering your thought.</p> : <p>Now type something. Anything will do.</p>}
        </div></CSSTransition>,

        [TUTORIAL_STEP_SECONDTHOUGHT]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>Well done!</p>
          <p>Try adding another thought. Do you remember how to do it?
            <TutorialHint>
              <br/><br/>{isMobile ? 'Trace the line below with your finger' : 'Hit the Enter key'} to create a new thought.
            </TutorialHint>
          </p>
        </div></CSSTransition>,

        [TUTORIAL_STEP_SECONDTHOUGHT_ENTER]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>Good work!</p>
          <p>{isMobile ? <React.Fragment>Swiping <GestureDiagram path={newThoughtShortcut.gesture} size='28' style={{ margin: '-10px -4px -6px' }} /></React.Fragment> : 'Hitting Enter'} will always create a new thought <i>after</i> the currently selected thought.</p>
          {!cursor || headValue(cursor).length > 0 ? <p>Wonderful. Click the Next button when you are ready to continue.</p> : <p>Now type some text for the new thought.</p>}
        </div></CSSTransition>,

        [TUTORIAL_STEP_SUBTHOUGHT]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>Now I am going to show you how to add a thought <i>within</i> another thought.</p>
          {cursor && headValue(cursor) === '' ? <p>Hit the Delete key to delete the current blank thought. It's not needed right now.</p> : null}
          {!cursor ? <p>{isMobile ? 'Tap' : 'Click'} a thought to select it.</p> : <p>{isMobile ? 'Trace the line below' : `${cursor && headValue(cursor) === '' ? 'Then h' : 'H'}old the ${isMac ? 'Command' : 'Ctrl'} key and hit the Enter key`}.</p>}
        </div></CSSTransition>,

        [TUTORIAL_STEP_SUBTHOUGHT_ENTER]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>As you can see, the new thought{cursor && cursor.length > 1 && headValue(cursor).length > 0 ? <React.Fragment> "{ellipsize(headValue(cursor))}"</React.Fragment> : null} is nested <i>within</i> {cursor && cursor.length > 1 ? <React.Fragment>"{ellipsize(headValue(contextOf(cursor)))}"</React.Fragment> : 'the other thought'}. This is useful for using a thought as a category, for example, but the exact meaning is up to you.</p>
          <p>You can create thoughts within thoughts within thoughts. There is no limit.</p>
          {!cursor || headValue(cursor).length > 0 ? <p>Click the Next button when you are ready to continue.</p> : <p>Feel free to type some text for the new thought.</p>}
        </div></CSSTransition>,

        [TUTORIAL_STEP_AUTOEXPAND]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>Thoughts <i>within</i> thoughts are automatically hidden when you {isMobile ? 'tap' : 'click'} away. {cursor
            ? <React.Fragment>Try {rootSubthoughts.length > 1 && rootSubthoughtNotCursor()
              ? <React.Fragment>{isMobile ? 'tapping' : 'clicking'} on {rootSubthoughtNotCursor()
                ? `"${ellipsize(rootSubthoughtNotCursor().value)}"`
                : 'it'
              }</React.Fragment>
              : rootSubthoughts.length <= 1 && !rootSubthoughtNotCursor() ? <React.Fragment>creating a new thought{rootSubthoughts.length === 1 ? <React.Fragment> after "{ellipsize(rootSubthoughts[0].value)}"</React.Fragment> : null}</React.Fragment>
              : `${isMobile ? 'tapping' : 'clicking'} in the blank area`} to hide the subthought{cursor && cursor.length > 1
                ? ` "${ellipsize(headValue(cursor))}"`
                : cursor
                  ? ` "${getThoughtsRanked(cursor)[0] && ellipsize(getThoughtsRanked(cursor)[0].value)}"`
                  : null
              }.</React.Fragment>
            : ''
            }
          </p>
        </div></CSSTransition>,

        [TUTORIAL_STEP_AUTOEXPAND_EXPAND]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          {rootGrandchildNotCursor() ? <p>Notice that "{ellipsize(rootGrandchildNotCursor().value)}" is hidden now.</p> : ''}
          <p>There are no files to open or close in <b>em</b>. All of your thoughts are in one place. You can stay focused because only a few thoughts are visible at a time.</p>
          <p>{isMobile ? 'Tap' : 'Click'} {rootSubthoughtNotCursorWithSubthoughts() ? `"${ellipsize(rootSubthoughtNotCursorWithSubthoughts().value)}"` : 'a thought'} to reveal its subthought{rootGrandchildNotCursor() ? ` "${ellipsize(rootGrandchildNotCursor().value)}"` : null}.</p>
        </div></CSSTransition>,

        [TUTORIAL_STEP_SUCCESS]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>Congratulations... You have completed Part <span style={{ fontFamily: 'serif' }}>I </span> of the tutorial. You now know the basics of creating thoughts in <b>em</b>.</p>
          <p>How are you feeling? Would you like to learn more or play on your own?</p>
        </div></CSSTransition>,

        // Part II: Connected Thoughts

        [TUTORIAL2_STEP_START]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>If the same thought appears in more than one place, <b>em</b> shows a small number to the right of the thought, for example: (<StaticSuperscript n={3} />).</p>
          <p>Let's see this in action.</p>
        </div></CSSTransition>,

        [TUTORIAL2_STEP_CHOOSE]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>For this tutorial, choose what kind of content you want to create. You will learn the same command regardless of which one you choose.</p>
        </div></CSSTransition>,

        [TUTORIAL2_STEP_CONTEXT1_PARENT]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>Let's begin! Create a new thought with the text “{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}”{cursor && headValue(cursor).startsWith('"') ? ' (without quotes)' : null}.</p>
          <p>You should create this thought at the top level, i.e. not <i>within</i> any other thoughts.
            <TutorialHint>
              <br/><br/>{
                rootSubthoughts.length > 0 && (!cursor || cursor.length > 1)
                  ? <React.Fragment>Select {rootSubthoughts.length === 1 ? 'the top-level thought' : 'one of the top-level thoughts'} ({joinConjunction(rootSubthoughts.map(child => `"${ellipsize(child.value)}"`), 'or')}). </React.Fragment>
                  : null
                }{isMobile ? 'Trace the line below with your finger' : `Hit the Enter key`} to create a new thought. Then type "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}".
            </TutorialHint>
          </p>
        </div></CSSTransition>,

        [TUTORIAL2_STEP_CONTEXT1]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>Let's say that {
            tutorialChoice === TUTORIAL_VERSION_TODO ? 'you want to make a list of things you have to do at home.' :
            tutorialChoice === TUTORIAL_VERSION_JOURNAL ? 'one of the themes in your journal is "Relationships".' :
            tutorialChoice === TUTORIAL_VERSION_BOOK ? `you hear a podcast on ${TUTORIAL_CONTEXT[tutorialChoice]}.` :
            null
          } Add a thought with the text "{TUTORIAL_CONTEXT[tutorialChoice]}" <i>within</i> “{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}”.</p>
          {rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase())
            ? <p>Do you remember how to do it?
              <TutorialHint>
                <br/><br/>{!cursor || headValue(cursor).toLowerCase() !== TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase() ? `Select "${TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}". ` : null}{isMobile ? 'Trace the line below with your finger' : `Hold ${isMac ? 'Command' : 'Ctrl'} and hit Enter`} to create a new thought <i>within</i> "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}". Then type "{TUTORIAL_CONTEXT[tutorialChoice]}".
              </TutorialHint>
            </p>
           : <p>Oops, somehow “{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}” was changed or deleted. Click the Prev button to go back.</p>
          }
        </div></CSSTransition>,

        [TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT]:
          context1SubthoughtCreated({ rootSubthoughts, tutorialChoice })
            ? <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
              <p>Nice work!</p>
              <p>{isMobile ? 'Tap' : 'Click'} the Next button when you are done entering your thought.</p>
            </div></CSSTransition>
            : <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
              <p>Now add a thought to “{TUTORIAL_CONTEXT[tutorialChoice]}”. {
                tutorialChoice === TUTORIAL_VERSION_TODO ? 'This could be any task you\'d like to get done.' :
                tutorialChoice === TUTORIAL_VERSION_JOURNAL ? 'This could be a specific person or a general thought about relationships.' :
                tutorialChoice === TUTORIAL_VERSION_BOOK ? 'You can just make up something about Psychology you could imagine hearing on a podcast.' :
                null
              }</p>
              {
                // e.g. Home
                rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) &&
                // e.g. Home/To Do
                getThoughtsRanked([TUTORIAL_CONTEXT1_PARENT[tutorialChoice]]).find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase())
                ? <p>Do you remember how to do it?
                  <TutorialHint>
                    <br/><br/>
                    {!cursor || headValue(cursor).toLowerCase() !== TUTORIAL_CONTEXT[tutorialChoice].toLowerCase() ? `Select "${TUTORIAL_CONTEXT[tutorialChoice]}". ` : null}
                    {isMobile ? 'Trace the line below with your finger ' : `Hold ${isMac ? 'Command' : 'Ctrl'} and hit Enter `}
                    to create a new thought <i>within</i> "{TUTORIAL_CONTEXT[tutorialChoice]}".
                  </TutorialHint>
                </p>
                : <p>Oops, somehow “{TUTORIAL_CONTEXT[tutorialChoice]}” was changed or deleted. Click the Prev button to go back.</p>
              }
            </div></CSSTransition>,

        [TUTORIAL2_STEP_CONTEXT2_PARENT]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>Now we are going to create a different "{TUTORIAL_CONTEXT[tutorialChoice]}" list.</p>
          <p>{
            tutorialChoice === TUTORIAL_VERSION_TODO ? null :
            tutorialChoice === TUTORIAL_VERSION_JOURNAL ? 'You probably talk about relationships in therapy. ' :
            tutorialChoice === TUTORIAL_VERSION_BOOK ? 'This time imagine reading a book about Psychology. ' :
            null
          }Create a new thought with the text “{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}”{cursor && headValue(cursor).startsWith('"') ? ' (without quotes)' : null} <i>after</i> "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}" (but at the same level).
            <TutorialHint>
              <br/><br/>{
                !cursor || headValue(cursor).toLowerCase() !== TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()
                  ? <React.Fragment>Select "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}." </React.Fragment>
                  : <React.Fragment>{isMobile ? 'Trace the line below with your finger' : `Hit the Enter key`} to create a new thought <i>after</i> "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}". Then type "{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}".</React.Fragment>
                }
            </TutorialHint>
          </p>
        </div></CSSTransition>,

        [TUTORIAL2_STEP_CONTEXT2]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>Now add a thought with the text "{TUTORIAL_CONTEXT[tutorialChoice]}" <i>within</i> “{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}”.</p>
          {
            // e.g. Work
            rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase())
            ? <p>Do you remember how to do it?
              <TutorialHint>
                <br/><br/>{cursor && cursor.length === 2 && cursor[0].value === TUTORIAL_CONTEXT2_PARENT[tutorialChoice]
                  ? `Type "${TUTORIAL_CONTEXT[tutorialChoice]}."`
                  : <React.Fragment>{!cursor || headValue(cursor) !== TUTORIAL_CONTEXT2_PARENT[tutorialChoice] ? `Select "${TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}". ` : null}{isMobile ? 'Trace the line below with your finger' : `Hold ${isMac ? 'Command' : 'Ctrl'} and hit Enter`} to create a new thought <i>within</i> "{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}".</React.Fragment>
                }
              </TutorialHint>
            </p>
            : <p>Oops, somehow “{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}” was changed or deleted. Click the Prev button to go back.</p>
          }
        </div></CSSTransition>,

        [TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT]: (() => {

          const value = TUTORIAL_CONTEXT[tutorialChoice] || ''
          const caseSensitiveValue = getContexts(value).length > 0 ? value : value.toLowerCase()
          const contexts = getContexts(caseSensitiveValue)

          return context2SubthoughtCreated({ rootSubthoughts, tutorialChoice })
            ? <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
              <p>Nice work!</p>
              <p>{isMobile ? 'Tap' : 'Click'} the Next button when you are done entering your thought.</p>
            </div></CSSTransition>
            : <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
              <p>Very good!</p>
              <p>Notice the small number (<StaticSuperscript n={contexts.length} />). This means that “{caseSensitiveValue}” appears in {contexts.length} place{contexts.length === 1 ? '' : 's'}, or <i>contexts</i> (in our case {joinConjunction(contexts
                  .filter(parent => !isRoot(parent))
                  .map(parent => `"${head(parent.context)
                }"`))}).</p>
              <p>Imagine {
                tutorialChoice === TUTORIAL_VERSION_TODO ? 'a new work task.' :
                tutorialChoice === TUTORIAL_VERSION_JOURNAL ? 'a realization you have about relationships in therapy.' :
                tutorialChoice === TUTORIAL_VERSION_BOOK ? 'a new thought related to psychology.' :
                null
              } Add it to this “{TUTORIAL_CONTEXT[tutorialChoice]}” list.</p>
              {
                // e.g. Work
                rootSubthoughts.find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase()) &&
                // e.g. Work/To Do
                getThoughtsRanked([TUTORIAL_CONTEXT2_PARENT[tutorialChoice]]).find(child => child.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase())
                ? <p>Do you remember how to do it?
                  <TutorialHint>
                    <br/><br/>
                    {!cursor || headValue(cursor).toLowerCase() !== TUTORIAL_CONTEXT[tutorialChoice].toLowerCase() ? `Select "${TUTORIAL_CONTEXT[tutorialChoice]}". ` : null}
                    {isMobile ? 'Trace the line below with your finger ' : `Hold ${isMac ? 'Command' : 'Ctrl'} and hit Enter `}
                    to create a new thought <i>within</i> "{TUTORIAL_CONTEXT[tutorialChoice]}".
                  </TutorialHint>
                </p>
                : <p>Oops, somehow “{TUTORIAL_CONTEXT[tutorialChoice]}” was changed or deleted. Click the Prev button to go back.</p>
              }
            </div></CSSTransition>
        })(),

        // [TUTORIAL2_STEP_SUBTHOUGHT2]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
        //   <p>Now create a new thought with the text “{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}”{cursor && headValue(cursor).startsWith('"') ? ' (without quotes)' : null}.</p>
        //   <p>You should create this thought at the top level, next to "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}".
        //     <TutorialHint>
        //       <br/><br/>{
        //         rootSubthoughts.length > 0 && (!cursor || cursor.length > 1)
        //           ? <React.Fragment>Select {rootSubthoughts.length === 1 ? 'the top-level thought' : 'one of the top-level thoughts'} ({joinConjunction(rootSubthoughts.map(child => `"${child.value}"`), 'or')}). </React.Fragment>
        //           : null
        //         }{isMobile ? 'Trace the line below with your finger' : `Hit the Enter key`} to create a new thought.
        //     </TutorialHint>
        //   </p>
        // </div></CSSTransition>,

        [TUTORIAL2_STEP_CONTEXT_VIEW_SELECT]: (() => {
          const caseSensitiveValue = getContexts(TUTORIAL_CONTEXT[tutorialChoice]).length > 0
            ? TUTORIAL_CONTEXT[tutorialChoice]
            : (TUTORIAL_CONTEXT[tutorialChoice] || '').toLowerCase()
          return <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
            <p>Now I'm going to show you the {isMobile ? 'gesture' : 'keyboard shortcut'} to view multiple contexts.</p>
            <p>First select "{caseSensitiveValue}".</p>
          </div></CSSTransition>
        })(),

        [TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE]: (() => {
          const caseSensitiveValue = getContexts(TUTORIAL_CONTEXT[tutorialChoice]).length > 0
            ? TUTORIAL_CONTEXT[tutorialChoice]
            : (TUTORIAL_CONTEXT[tutorialChoice] || '').toLowerCase()
          return <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
            {!cursor || headValue(cursor) !== caseSensitiveValue
            ? <p>First select "{caseSensitiveValue}".</p>
            : <React.Fragment>
              {isHint() ? <p>You did the right gesture, but somehow "{caseSensitiveValue}" wasn't selected. Try{!cursor || headValue(cursor) !== caseSensitiveValue ? <React.Fragment> selecting "{caseSensitiveValue}" and trying</React.Fragment> : null} again.</p> : null}
              <p>{isMobile ? 'Trace the line below' : `Hit ${formatKeyboardShortcut(shortcutById('toggleContextView').keyboard)}`} to view the current thought's contexts.</p>
            </React.Fragment>}
          </div></CSSTransition>
        })(),

        [TUTORIAL2_STEP_CONTEXT_VIEW_OPEN]: (() => {
          const caseSensitiveValue = getContexts(TUTORIAL_CONTEXT[tutorialChoice]).length > 0
            ? TUTORIAL_CONTEXT[tutorialChoice]
            : (TUTORIAL_CONTEXT[tutorialChoice] || '').toLowerCase()
          return !cursor ||
            !cursor.some(thought =>
              thought.value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase() ||
              thought.value.toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase() ||
              thought.value.toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()
            )
              ? <p>Oops, "{caseSensitiveValue}" is hidden because the selection changed. Select "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}" or "{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}" to show it again.</p>
              : !contextViews[hashContext([(
                cursor && cursor[0].value.toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()
                  ? TUTORIAL_CONTEXT1_PARENT
                  : TUTORIAL_CONTEXT2_PARENT
              )[tutorialChoice], TUTORIAL_CONTEXT[tutorialChoice]])] ? <p>Oops, somehow the context view was closed. Click the Prev button to go back.</p>
              : <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
                <p>Well, look at that. We now see all of the contexts in which "{caseSensitiveValue}" appears, namely "{TUTORIAL_CONTEXT1_PARENT[tutorialChoice]}" and "{TUTORIAL_CONTEXT2_PARENT[tutorialChoice]}". </p>
                <p>You can select a context from this list to view its subthoughts without having to navigate to its original location.</p>
                <p>There are no manual links in <b>em</b>. By typing the same thought in multiple contexts, they will automatically be linked.</p>
              </div></CSSTransition>
        })(),

        [TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>Here are some real-world examples of using contexts in <b>em</b>:</p>
          <ul>
            <li>View all thoughts related to a particular person, place, or thing.</li>
            <li>Keep track of quotations from different sources.</li>
            <li>Create a link on the home screen to a deeply nested subthought for easy access.</li>
          </ul>
          <p>The more thoughts you add to <b>em</b>, the more useful this feature will become.</p>
        </div></CSSTransition>,

        [TUTORIAL2_STEP_SUCCESS]: <CSSTransition in={true} key={Math.floor(tutorialStep)} timeout={400} classNames='slide'><div>
          <p>Congratulations! You have completed Part <span style={{ fontFamily: 'serif' }}>II </span> of the tutorial. You now have the skills to create a vast web of thoughts in <b>em</b>.</p>
          <p>That's right; you're on your own now. But you can always replay this tutorial or explore all of the available {isMobile ? 'gestures' : 'keyboard shortcuts'} by clicking the <a onClick={() => dispatch({ type: 'showModal', id: 'help' })}>Help</a> link in the footer.</p>
          <p>Happy Sensemaking!</p>
        </div></CSSTransition>,

      }[Math.floor(tutorialStep)] || <p>Oops! I am supposed to continue the tutorial, but I do not recognize tutorial step {tutorialStep}.</p>}
      </TransitionGroup></div>

      <div className='center'>

        <div className='tutorial-step-bullets'>{Array(tutorialStep < TUTORIAL2_STEP_START
          ? TUTORIAL_STEP_SUCCESS - TUTORIAL_STEP_START + 1
          : TUTORIAL2_STEP_SUCCESS - TUTORIAL2_STEP_START + 1
        ).fill().map((_, i) => {
          const step = i + (tutorialStep < TUTORIAL2_STEP_START ? 1 : TUTORIAL2_STEP_START)
          return <a
            className={classNames({
              'tutorial-step-bullet': true,
              active: step === Math.floor(tutorialStep)
            })}
            key={step}
            onClick={() => dispatch({ type: 'tutorialStep', value: step })}>•</a>
        }
        )}</div>

        {tutorialStep === TUTORIAL_STEP_SUCCESS
          ? <React.Fragment>
            <a className='tutorial-button button button-variable-width' onClick={() => dispatch({ type: 'tutorialStep', value: TUTORIAL2_STEP_START })}>Learn more</a>
            <a className='tutorial-button button button-variable-width' onClick={() => dispatch({ type: 'tutorial', value: false })}>Play on my own</a>
          </React.Fragment>
        : tutorialStep === TUTORIAL2_STEP_CHOOSE
          ? <ul className='simple-list'>
            <li><a className='tutorial-button button button-variable-width' onClick={() => {
              dispatch({ type: 'tutorialChoice', value: TUTORIAL_VERSION_TODO })
              tutorialNext()
            }}>To-Do List</a></li>
            <li><a className='tutorial-button button button-variable-width' onClick={() => {
              dispatch({ type: 'tutorialChoice', value: TUTORIAL_VERSION_JOURNAL })
              tutorialNext()
            }}>Journal Theme</a></li>
            <li><a className='tutorial-button button button-variable-width' onClick={() => {
              dispatch({ type: 'tutorialChoice', value: TUTORIAL_VERSION_BOOK })
              tutorialNext()
            }}>Book/Podcast Notes</a></li>
          </ul>
        : <React.Fragment>
            <TutorialPrev tutorialStep={tutorialStep} />
            <TutorialNext tutorialStep={tutorialStep} />
          </React.Fragment>
        }
      </div>
    </div>

    {isMobile && (
      tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT ||
      tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_HINT ||
      tutorialStep === TUTORIAL_STEP_SUBTHOUGHT ||
      tutorialStep === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE ||
      tutorialStep === TUTORIAL2_STEP_CONTEXT1_PARENT_HINT ||
      (tutorialStep === TUTORIAL2_STEP_CONTEXT1_HINT && cursor && headValue(cursor).toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) ||
      (tutorialStep === TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT && cursor && headValue(cursor).toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase()) ||
      (tutorialStep === TUTORIAL2_STEP_CONTEXT2_PARENT_HINT && cursor && headValue(cursor).toLowerCase() === TUTORIAL_CONTEXT1_PARENT[tutorialChoice].toLowerCase()) ||
      (tutorialStep === TUTORIAL2_STEP_CONTEXT2_HINT && cursor && headValue(cursor).toLowerCase() === TUTORIAL_CONTEXT2_PARENT[tutorialChoice].toLowerCase()) ||
      (tutorialStep === TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT && cursor && headValue(cursor).toLowerCase() === TUTORIAL_CONTEXT[tutorialChoice].toLowerCase())
    )
      ? <div className='tutorial-trace-gesture'>
        <GestureDiagram path={
          tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT ||
          tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_HINT ||
          tutorialStep === TUTORIAL2_STEP_CONTEXT1_PARENT_HINT ||
          tutorialStep === TUTORIAL2_STEP_CONTEXT2_PARENT_HINT
            ? shortcutById('newThought').gesture
          : tutorialStep === TUTORIAL_STEP_SUBTHOUGHT ||
            tutorialStep === TUTORIAL2_STEP_CONTEXT1_HINT ||
            tutorialStep === TUTORIAL2_STEP_CONTEXT1_SUBTHOUGHT_HINT ||
            tutorialStep === TUTORIAL2_STEP_CONTEXT2_HINT ||
            tutorialStep === TUTORIAL2_STEP_CONTEXT2_SUBTHOUGHT_HINT
            ? shortcutById('newSubthought').gesture
          : tutorialStep === TUTORIAL2_STEP_CONTEXT_VIEW_TOGGLE
            ? shortcutById('toggleContextView').gesture
          : null
          }
          size='160'
          strokeWidth='10'
          arrowSize='5'
          className='animate-pulse'
        />
      </div>
      : null
    }

  </div></div>
})
