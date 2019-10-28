import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import { isMobile, isMac } from '../browser.js'

// constants
import {
  ROOT_TOKEN,
  TUTORIAL_SAMPLE_CONTEXT,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_FIRSTTHOUGHT_ENTER,
  TUTORIAL_STEP_FIRSTTHOUGHT_ENTER_HINT,
  TUTORIAL_STEP_SECONDTHOUGHT,
  TUTORIAL_STEP_SECONDTHOUGHT_HINT,
  TUTORIAL_STEP_SECONDTHOUGHT_ENTER,
  TUTORIAL_STEP_SECONDTHOUGHT_ENTER_HINT,
  TUTORIAL_STEP_SUBTHOUGHT,
  TUTORIAL_STEP_SUBTHOUGHT_ENTER,
  TUTORIAL_STEP_AUTOEXPAND,
  TUTORIAL_STEP_AUTOEXPAND_EXPAND,
  TUTORIAL_STEP_SUCCESS,
  TUTORIAL_STEP_NONE,
  TUTORIAL2_STEP_START,
  TUTORIAL2_STEP_CREATE,
  TUTORIAL2_STEP_SUBTHOUGHT,
  TUTORIAL2_STEP_SUBTHOUGHT_HINT,
  TUTORIAL2_STEP_SUBTHOUGHT_HINT_ENTER,
  TUTORIAL2_STEP_DUPLICATE_THOUGHT,
  TUTORIAL2_STEP_MULTIPLE_CONTEXTS,
  TUTORIAL2_STEP_CONTEXT_VIEW_SELECT,
  TUTORIAL2_STEP_CONTEXT_VIEW_TRACE,
  TUTORIAL2_STEP_CONTEXT_VIEW_OPEN,
  TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES,
  TUTORIAL2_STEP_SUCCESS,
} from '../constants.js'

import {
  tutorialNext,
  tutorialPrev,
} from '../action-creators/tutorial.js'

import {
  formatKeyboardShortcut,
  shortcutById,
} from '../shortcuts.js'

import {
  getChildrenWithRank,
  getContexts,
  encodeItems,
  isTutorial,
  joinAnd,
  sigKey,
  unrank,
} from '../util.js'

// components
import { GestureDiagram } from './GestureDiagram.js'
import { StaticSuperscript } from './StaticSuperscript.js'
import { TutorialHint } from './TutorialHint.js'

const TutorialNext = connect(({ expanded, settings: { tutorialStep } = {} }) => ({ expanded, tutorialStep }))(({ expanded, tutorialStep }) => [
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_FIRSTTHOUGHT_ENTER_HINT,
  TUTORIAL_STEP_SUCCESS,
  TUTORIAL_STEP_SECONDTHOUGHT_ENTER_HINT,
  TUTORIAL2_STEP_START,
  TUTORIAL2_STEP_CONTEXT_VIEW_OPEN,
  TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES,
  TUTORIAL2_STEP_SUCCESS,
].includes(tutorialStep) || (tutorialStep === TUTORIAL_STEP_AUTOEXPAND && Object.keys(expanded).length === 0)
  ? <a className='tutorial-button button button-variable-width' onClick={tutorialNext}>{tutorialStep === TUTORIAL_STEP_SUCCESS || tutorialStep === TUTORIAL2_STEP_SUCCESS ? 'Finish' : 'Next'}</a>
  : <span className='tutorial-next-wait text-small'>Complete the instructions to continue</span>
)

const TutorialPrev = ({ tutorialStep }) => <a className={classNames({
  'tutorial-prev': true,
  button: true,
  'button-variable-width': true
})} disabled={tutorialStep === TUTORIAL_STEP_START} onClick={() => tutorialPrev(tutorialStep) }>Prev</a>

const NoNeedToHitEnterWarning = () => <React.Fragment>
  <p>Good work!</p>
  <p>Note that you don't need to hit Enter to complete a thought. It is saved automatically. Enter is used to create a new thought.</p>
</React.Fragment>

export const Tutorial = connect(({ contextChildren, cursor, data, settings: { tutorialStep } = {} }) => ({ contextChildren, cursor, data, tutorialStep }))(({ contextChildren, cursor, data, tutorialStep, dispatch }) => {

  if (!isTutorial()) return null

  const rootChildren = contextChildren[encodeItems([ROOT_TOKEN])] || []

  // a thought in the root that is not the cursor
  const rootChildNotCursor = () => cursor
    ? rootChildren.find(child => unrank(cursor).indexOf(child.key) === -1)
    : getChildrenWithRank([rootChildren[0]]).length > 0 ? rootChildren[1] : rootChildren[0]

  // "To do" thought in the root that is not the cursor
  const rootChildNotTodo = () =>
    rootChildren.find(child =>
      child.key &&
      (
        getChildrenWithRank([child]).length === 0 ||
        !getChildrenWithRank([child]).some(c => c.key.toLowerCase() === TUTORIAL_SAMPLE_CONTEXT.toLowerCase())
      )
    )

  // a thought in the root that is not the cursor and has children
  const rootChildNotCursorWithChildren = () =>
    rootChildren.find(child =>
      (!cursor || unrank(cursor).indexOf(child.key) === -1) &&
      getChildrenWithRank([child]).length > 0
    )

  // a child of a thought in the root that is not the cursor
  const rootGrandchildNotCursor = () => {
    const uncle = rootChildNotCursorWithChildren()
    return uncle ? getChildrenWithRank([uncle])[0] : null
  }

  return <div className='tutorial'><div className='tutorial-inner'>
    <a className='upper-right tutorial-skip text-small' style={{ visibility: tutorialStep !== TUTORIAL_STEP_SUCCESS && tutorialStep !== TUTORIAL2_STEP_SUCCESS ? 'visible' : 'hidden' }} onClick={() => dispatch({ type: 'tutorialStep', value: TUTORIAL_STEP_NONE })}>✕ close tutorial</a>
    <div className='clear'>
      <div className='tutorial-text'>
      {{

        [TUTORIAL_STEP_START]: <React.Fragment>
          <p>Welcome to your personal thoughtspace.</p>
          <p>Don't worry. I will walk you through everything you need to know.</p>
          <p>Let's begin...</p>
        </React.Fragment>,

        [TUTORIAL_STEP_FIRSTTHOUGHT]: <React.Fragment>
          <p>First, let me show you how to create a new thought in <b>em</b> using a {isMobile ? 'gesture' : 'keyboard shortcut'}.</p>
          <p>It's amazingly simple. {isMobile ? 'Trace the line below with your finger' : 'Type the Enter key'} to create a new thought.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_FIRSTTHOUGHT_ENTER]: <React.Fragment>
          {tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT_ENTER_HINT
            ? <NoNeedToHitEnterWarning />
            : <p>You did it! Now type something. Anything will do.</p>
          }
        </React.Fragment>,

        [TUTORIAL_STEP_SECONDTHOUGHT]: <React.Fragment>
          <p>Well done!</p>
          <p>Try adding another thought. Do you remember the {isMobile ? 'gesture' : 'shortcut'}?
            <TutorialHint>
              <br/><br/>{isMobile ? 'Trace the line below with your finger' : 'Type the Enter key'} to create a new thought.
            </TutorialHint>
          </p>
        </React.Fragment>,

        [TUTORIAL_STEP_SECONDTHOUGHT_ENTER]: <React.Fragment>
          {tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_ENTER_HINT
            ? <NoNeedToHitEnterWarning />
            : <p>Good work! Now type some text for the new thought.</p>
          }
        </React.Fragment>,

        [TUTORIAL_STEP_SUBTHOUGHT]: <div>
          <p>Now I am going to show you how to add a subthought.</p>
          {cursor && sigKey(cursor) === '' ? <p>Type the Delete key to delete the current blank thought. It's not needed right now.</p> : null}
          <p>{isMobile ? 'Trace the line below' : `${cursor && sigKey(cursor) === '' ? 'Then h' : 'H'}old the ${isMac ? 'Command' : 'Ctrl'} key and type the Enter key`} to create a new subthought.</p>
        </div>,

        [TUTORIAL_STEP_SUBTHOUGHT_ENTER]: <React.Fragment>
          <p>Well done!</p>
          <p>As you can see, a subthought is nested <i>below</i> the current thought.</p>
          <p>Feel free to type some text for the new subthought.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_AUTOEXPAND]: <React.Fragment>
          <p>Subthoughts are automatically hidden when you select a different thought. {cursor
            ? <React.Fragment>Try {rootChildren.length > 1 && rootChildNotCursor()
              ? <React.Fragment>{isMobile ? 'tapping' : 'clicking'} on {rootChildNotCursor()
                ? `"${rootChildNotCursor().key}"`
                : 'it'
              }</React.Fragment>
              : `${isMobile ? 'tapping' : 'clicking'} in the blank area`} to hide the subthought{cursor && cursor.length > 1
                ? ` "${sigKey(cursor)}"`
                : cursor
                  ? ` "${getChildrenWithRank(cursor)[0] && getChildrenWithRank(cursor)[0].key}"`
                  : null
              }.</React.Fragment>
            : rootGrandchildNotCursor()
              ? `Currently, "${rootGrandchildNotCursor().key}" is hidden.`
              : ''
            }
          </p>
        </React.Fragment>,

        [TUTORIAL_STEP_AUTOEXPAND_EXPAND]: <React.Fragment>
          {rootGrandchildNotCursor() ? <p>Notice that "{rootGrandchildNotCursor().key}" is hidden now.</p> : ''}
          <p>There are no files to open or close in <b>em</b>. All of your thoughts are in one place. But it stays organized because only the selected thought and its subthoughts are visible.</p>
          <p>{isMobile ? 'Tap' : 'Click'} {rootChildNotCursorWithChildren() ? `"${rootChildNotCursorWithChildren().key}"` : 'a thought'} to reveal the subthought {rootGrandchildNotCursor() ? `"${rootGrandchildNotCursor().key}"` : 'its subthought'}.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_SUCCESS]: <React.Fragment>
          <p>Congratulations... You have completed the <i>Intro</i> tutorial. You can organize a lot of thoughts with what you've learned.</p>
          <p>How are you feeling? Would you like to learn more or play on your own?</p>
        </React.Fragment>,

        // Part II: Connected Thoughts

        [TUTORIAL2_STEP_START]: <React.Fragment>
          <p>If the same thought appears in more than one place, <b>em</b> shows a small number to the right of the thought, for example: (<StaticSuperscript n={3} />).</p>
          <p>Let's see this in action.</p>
        </React.Fragment>,

        [TUTORIAL2_STEP_CREATE]: <React.Fragment>
          <p>In any thought, create a subthought with the words “{TUTORIAL_SAMPLE_CONTEXT}”{cursor && sigKey(cursor).startsWith('"') ? ' (without quotes)' : null}.
            <TutorialHint hint={tutorialStep === TUTORIAL2_STEP_SUBTHOUGHT_HINT}>
              <br/><br/>{isMobile ? 'Trace the line below with your finger' : `Hold ${isMac ? 'Command' : 'Ctrl'} and type Enter`} to create a new subthought.
            </TutorialHint>
            </p>
          <p>It’s okay if it doesn’t make sense there. We’re just setting up the correct structure.</p>
        </React.Fragment>,

        [TUTORIAL2_STEP_SUBTHOUGHT]: <React.Fragment>
          {tutorialStep !== TUTORIAL2_STEP_SUBTHOUGHT_HINT_ENTER ? <React.Fragment>
            <p>Now add an item to “{TUTORIAL_SAMPLE_CONTEXT}”.</p>
            <p>Do you remember the {isMobile ? 'gesture' : 'keyboard shortcut'}?
              <TutorialHint hint={tutorialStep === TUTORIAL2_STEP_SUBTHOUGHT_HINT}>
                <br/><br/>{isMobile ? 'Trace the line below with your finger' : `Hold ${isMac ? 'Command' : 'Ctrl'} and type Enter`} to create a new subthought.
              </TutorialHint>
            </p>
          </React.Fragment> : <p>It should probably have some text.</p>}
          </React.Fragment>,

        [TUTORIAL2_STEP_DUPLICATE_THOUGHT]: <React.Fragment>
          <p>Now things are going to get interesting.</p>
          <p>Try creating another “{TUTORIAL_SAMPLE_CONTEXT}” {cursor && sigKey(cursor).startsWith('"') ? ' (without quotes)' : null}within a different thought{rootChildNotTodo() ? ` (e.g. in "${rootChildNotTodo().key}")` : ''}.</p>
        </React.Fragment>,

        [TUTORIAL2_STEP_MULTIPLE_CONTEXTS]: (() => {
          const caseSensitiveTodo = getContexts(TUTORIAL_SAMPLE_CONTEXT).length > 0 ? TUTORIAL_SAMPLE_CONTEXT : TUTORIAL_SAMPLE_CONTEXT.toLowerCase()
          const contexts = getContexts(caseSensitiveTodo)
          return <React.Fragment>
            {contexts.length < 2
              ? <p>Check for typos. The two thoughts must match "{TUTORIAL_SAMPLE_CONTEXT}" exactly.</p>
              : <React.Fragment>
                <p>Very good!</p>
                <p>Notice the small number (<StaticSuperscript n={contexts.length} />). This means that “{caseSensitiveTodo}” has {contexts.length} connection{contexts.length === 1 ? '' : 's'}, or <i>contexts</i> (in our case {joinAnd(contexts.map(parent => `"${parent.context.toString()}"`))}).</p>
                <p>Add an item to this new Todo list.</p>
              </React.Fragment>
            }
          </React.Fragment>
        })(),

        [TUTORIAL2_STEP_CONTEXT_VIEW_SELECT]: (() => {
          const caseSensitiveTodo = getContexts(TUTORIAL_SAMPLE_CONTEXT).length > 0 ? TUTORIAL_SAMPLE_CONTEXT : TUTORIAL_SAMPLE_CONTEXT.toLowerCase()
          return <React.Fragment>
            <p>Now I'm going to show you the {isMobile ? 'gesture' : 'shortcut'} to reveal multiple contexts.</p>
            <p>First select the thought whose contexts you wish to reveal (in this case, "{caseSensitiveTodo}").</p>
          </React.Fragment>
        })(),

        [TUTORIAL2_STEP_CONTEXT_VIEW_TRACE]: (() => {
          return <React.Fragment>
            <p>{isMobile ? 'Trace the line below' : `Type ${formatKeyboardShortcut(shortcutById('toggleContextView').keyboard, { textNames: true })}`} to view the current thought's connections.</p>
          </React.Fragment>
        })(),

        [TUTORIAL2_STEP_CONTEXT_VIEW_OPEN]: (() => {
          const caseSensitiveTodo = getContexts(TUTORIAL_SAMPLE_CONTEXT).length > 0 ? TUTORIAL_SAMPLE_CONTEXT : TUTORIAL_SAMPLE_CONTEXT.toLowerCase()
          return <React.Fragment>
            <p>Well, look at that. Both "{caseSensitiveTodo}" lists in one place. Trust me, this will be more impressive after you have more thoughts in your thoughtspace.</p>
            <p>There are no manual links in <b>em</b>. Simply type a thought, and it is automatically linked to every other identical thought.</p>
          </React.Fragment>
        })(),

        [TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES]: <React.Fragment>
          <p>Here are some real-world examples of using contexts in <b>em</b>:</p>
          <ul>
            <li>View all thoughts related to a person.</li>
            <li>Reference the same idea from multiple places.</li>
            <li>Create a link on the home screen to a deeply nested subthought.</li>
          </ul>
          <p>The more thoughts you add to <b>em</b>, the more useful this feature will become.</p>
        </React.Fragment>,

        [TUTORIAL2_STEP_SUCCESS]: <React.Fragment>
          <p>Congratulations! You have completed the <i>Contexts</i> tutorial.</p>
          <p>You now have the skills to create a vast web of thoughts in <b>em</b>.</p>
          <p>That's right; you're on your own now. But you can always replay this tutorial or explore all of the available {isMobile ? 'gestures' : 'keyboard shortcuts'} by clicking the <a onClick={() => dispatch({ type: 'showHelper', id: 'help' })}>Help</a> link in the footer.</p>
          <p>Happy Sensemaking!</p>
        </React.Fragment>,

      }[Math.floor(tutorialStep)] || <p>Oops! I am supposed to continue the tutorial, but I do not recognize tutorial step {tutorialStep}.</p>}
      </div>
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
            <a className='tutorial-button button button-variable-width' onClick={() => dispatch({ type: 'tutorialStep', value: TUTORIAL_STEP_NONE })}>Play on my own</a>
          </React.Fragment>
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
      tutorialStep === TUTORIAL2_STEP_SUBTHOUGHT_HINT ||
      tutorialStep === TUTORIAL2_STEP_CONTEXT_VIEW_TRACE
    )
      ? <div className='tutorial-trace-gesture'>
        <GestureDiagram path={
          tutorialStep === TUTORIAL_STEP_FIRSTTHOUGHT ||
          tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_HINT
            ? shortcutById('newThought').gesture
          : tutorialStep === TUTORIAL_STEP_SUBTHOUGHT ||
            tutorialStep === TUTORIAL2_STEP_SUBTHOUGHT_HINT
            ? shortcutById('newSubthought').gesture
          : tutorialStep === TUTORIAL2_STEP_CONTEXT_VIEW_TRACE
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

