import React from 'react'
import { connect } from 'react-redux'
import * as classNames from 'classnames'
import { isMobile } from '../browser.js'

// constants
import {
  ROOT_TOKEN,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_FIRSTTHOUGHT,
  TUTORIAL_STEP_ENTERTHOUGHT,
  TUTORIAL_STEP_SECONDTHOUGHT,
  TUTORIAL_STEP_SECONDTHOUGHT_HINT,
  TUTORIAL_STEP_SECONDTHOUGHT_ENTER,
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

const TutorialStepSecondThought = connect()(({ hint, dispatch }) =>
  <React.Fragment>
    <p>Well done!</p>
    <p>Do you remember the {isMobile ? 'gesture' : 'shortcut'}? Try adding another thought.
      <TutorialHint>
        <p>Trace the line below with your finger to create a new thought.</p>
      </TutorialHint>
    </p>
  </React.Fragment>
)

export const Tutorial = connect(({ contextChildren, cursor, data, settings: { tutorialStep } = {} }) => ({ contextChildren, cursor, data, tutorialStep }))(({ contextChildren, cursor, data, tutorialStep, dispatch }) => {

  if (!isTutorial()) return null

  const rootChildren = contextChildren[encodeItems([ROOT_TOKEN])] || []

  // a thought in the root that is not the cursor
  const rootChildNotCursor = () => cursor
    ? rootChildren.find(child => unrank(cursor).indexOf(child.key) === -1)
    : rootChildren[0]

  // a non-empty thought in the root that is not the cursor
  const rootChildNotTodo = () =>
    rootChildren.find(child =>
      child.key &&
      (
        getChildrenWithRank([child]).length === 0 ||
        !getChildrenWithRank([child]).some(c => c.key.toLowerCase() === 'todo')
      )
    )

  // a thought in the root that is not the cursor and has children
  const rootChildNotCursorWithChildren = () => cursor
    ? rootChildren.find(child =>
      unrank(cursor).indexOf(child.key) === -1 &&
      getChildrenWithRank([child]).length > 0
    )
    : null

  // a child of a thought in the root that is not the cursor
  const rootGrandchildNotCursor = () => {
    const uncle = rootChildNotCursorWithChildren()
    return uncle ? getChildrenWithRank([uncle])[0] : null
  }

  return <div className='tutorial'>
    <a className='upper-right tutorial-skip text-small' style={{ visibility: tutorialStep !== TUTORIAL_STEP_SUCCESS && tutorialStep !== TUTORIAL2_STEP_SUCCESS ? 'visible' : 'hidden' }} onClick={() => dispatch({ type: 'tutorialStep', value: TUTORIAL_STEP_NONE })}>✕ close tutorial</a>
    <div className='clear'>
      {{

        [TUTORIAL_STEP_START]: <React.Fragment>
          <p>Welcome to your personal thoughtspace. Everything you write here will be stored privately on this device, protected by your device password.</p>
          <p>Don't worry. I will walk you through everything you need to know. Let's begin...</p>
        </React.Fragment>,

        [TUTORIAL_STEP_FIRSTTHOUGHT]: <React.Fragment>
          <p>First, let me show you how to create a new thought in <b>em</b> using a {isMobile ? 'gesture' : 'keyboard shortcut'}.</p>
          <p>Trace the line below with your finger to create a new thought.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_ENTERTHOUGHT]: <React.Fragment>
          <p>You did it! Now enter a thought. Anything will do.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_SECONDTHOUGHT]: <TutorialStepSecondThought hint={tutorialStep === TUTORIAL_STEP_SECONDTHOUGHT_HINT} />,

        [TUTORIAL_STEP_SECONDTHOUGHT_ENTER]: <React.Fragment>
          <p>Good work! Now enter some text for the new thought.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_SUBTHOUGHT]: <React.Fragment>
          <p>Now I am going to show you how to add a subthought.</p>
          <p>Trace the line below to create a new subthought.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_SUBTHOUGHT_ENTER]: <React.Fragment>
          <p>Well done!</p>
          <p>As you can see, a subthought is nested <i>below</i> the current thought.</p>
          <p>Feel free to enter some text for the new subthought.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_AUTOEXPAND]: <React.Fragment>
          <p>Subthoughts are automatically hidden when you move the cursor away from a thought. {rootChildNotCursor() ? <span>Try {isMobile ? 'tapping' : 'clicking'} on "{rootChildNotCursor().key}".</span> : null}</p>
          {cursor ? <p>(The cursor is the darker circle next to "{sigKey(cursor)}").</p> : null}
        </React.Fragment>,

        [TUTORIAL_STEP_AUTOEXPAND_EXPAND]: <React.Fragment>
          {rootGrandchildNotCursor() ? <p>Notice that "{rootGrandchildNotCursor().key}" is hidden now. This is the autofocus feature. It helps you stay focused on your current thoughts.</p> : ''}
          <p>{isMobile ? 'Tap' : 'Click'} on {rootChildNotCursorWithChildren() ? `"${rootChildNotCursorWithChildren().key}"` : 'a thought'} to show {rootGrandchildNotCursor() ? `"${rootGrandchildNotCursor().key}"` : 'its subthought'} again.</p>
        </React.Fragment>,

        [TUTORIAL_STEP_SUCCESS]: <React.Fragment>
          <p>Congratulations... You have completed the Intro tutorial! You can organize a lot of thoughts with what you've learned.</p>
          <p>How are you feeling? Would you like to learn more or play on your own?</p>
        </React.Fragment>,

        // Part II: Connected Thoughts

        [TUTORIAL2_STEP_START]: <React.Fragment>
          <p>If the same thought appears in more than one place, <b>em</b> shows a small number to the right of the thought, for example: (<StaticSuperscript n={3} />).</p>
          <p>Let's see this in action.</p>
        </React.Fragment>,

        [TUTORIAL2_STEP_CREATE]: <React.Fragment>
          <p>Create a subthought “Todo” inside another thought.</p>
          <p>It’s okay if it doesn’t make sense there. We’re just setting up the correct structure.</p>
        </React.Fragment>,

        [TUTORIAL2_STEP_SUBTHOUGHT]: <React.Fragment>
          <p>Now add an item to “Todo”.</p>
          {tutorialStep !== TUTORIAL2_STEP_SUBTHOUGHT_HINT_ENTER ? <p>Do you remember the {isMobile ? 'gesture' : 'keyboard shortcut'}?
            <TutorialHint hint={tutorialStep === TUTORIAL2_STEP_SUBTHOUGHT_HINT}>
              <br/><br/>Trace the line below with your finger to create a new subthought.
            </TutorialHint>
          </p> : <p>It should probably have some text.</p>}
        </React.Fragment>,

        [TUTORIAL2_STEP_DUPLICATE_THOUGHT]: <React.Fragment>
          <p>Now things are going to get interesting.</p>
          <p>Try creating another “Todo” within a different thought{rootChildNotTodo() ? ` (e.g. in "${rootChildNotTodo().key}")` : ''}.</p>
        </React.Fragment>,

        [TUTORIAL2_STEP_MULTIPLE_CONTEXTS]: (() => {
          const caseSensitiveTodo = getContexts('Todo').length > 0 ? 'Todo' : 'todo'
          const contexts = getContexts(caseSensitiveTodo)
          return <React.Fragment>
            <p>Very good!</p>
            <p>Notice the small number (<StaticSuperscript n={contexts.length} />). This means that “{caseSensitiveTodo}” has {contexts.length} connection{contexts.length === 1 ? '' : 's'}, or <i>contexts</i> (in our case {joinAnd(contexts.map(parent => `"${parent.context.toString()}"`))}).</p>
            <p>Add an item to this new Todo list.</p>
          </React.Fragment>
        })(),

        [TUTORIAL2_STEP_CONTEXT_VIEW_SELECT]: (() => {
          const caseSensitiveTodo = getContexts('Todo').length > 0 ? 'Todo' : 'todo'
          return <React.Fragment>
            <p>Now I'm going to show you the {isMobile ? 'gesture' : 'shortcut'} to reveal those contexts. This is very useful when you have hundreds or thousands of thoughts in <b>em</b>.</p>
            <p>Move the cursor onto the thought whose contexts you wish to reveal (in this case, "{caseSensitiveTodo}").</p>
          </React.Fragment>
        })(),

        [TUTORIAL2_STEP_CONTEXT_VIEW_TRACE]: (() => {
          return <React.Fragment>
            <p>Trace the line below to view the current thought's connections.</p>
          </React.Fragment>
        })(),

        [TUTORIAL2_STEP_CONTEXT_VIEW_OPEN]: (() => {
          const caseSensitiveTodo = getContexts('Todo').length > 0 ? 'Todo' : 'todo'
          return <React.Fragment>
            <p>Well, look at that. Both "{caseSensitiveTodo}" lists in one place. Trust me, this will be more impressive after you have more thoughts in your thoughtspace.</p>
            <p>You can view the unique subthoughts of each "{caseSensitiveTodo}" by {isMobile ? 'tapping' : 'clicking'} the desired context.</p>
            <p>There are no manual links in <b>em</b>. Simply type a thought, and it is automatically linked to every other identical thought.</p>
          </React.Fragment>
        })(),

        [TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES]: <React.Fragment>
          <p>Here are some real-world examples of using contexts in <b>em</b>:</p>
          <ul>
            <li>Viewing all thoughts related to a person.</li>
            <li>Keeping track of “Open Questions” across multiple categories.</li>
            <li>Creating a link on the home screen to a deeply nested subthought.</li>
          </ul>
          <p>The more thoughts you add to <b>em</b>, the more useful this feature will become.</p>
        </React.Fragment>,

        [TUTORIAL2_STEP_SUCCESS]: <React.Fragment>
          <p>Congratulations! You have completed the tutorial.</p>
          <p>You now have the skills to create a vast web of thoughts in <b>em</b>.</p>
          <p>That's right; you're on your own now. But you can always replay this tutorial or explore all of the available {isMobile ? 'gestures' : 'keyboard shortcuts'} by clicking the <u>Help</u> link in the footer.</p>
          <p>Happy Sensemaking!</p>
        </React.Fragment>,

      }[Math.floor(tutorialStep)] || <p>Oops! I am supposed to continue the tutorial, but I do not recognize tutorial step {tutorialStep}.</p>}
      <div className='center'>

        {tutorialStep === TUTORIAL_STEP_SUCCESS
          ? <div style={{ margin: '25px 0 10px' }}>
            <a className='tutorial-button button button-variable-width' onClick={() => dispatch({ type: 'tutorialStep', value: TUTORIAL2_STEP_START })}>Learn more</a>
            <a className='tutorial-button button button-variable-width' onClick={() => dispatch({ type: 'tutorialStep', value: TUTORIAL_STEP_NONE })}>Play on my own</a>
          </div>
        : !(
          Math.floor(tutorialStep) === TUTORIAL_STEP_START ||
          Math.floor(tutorialStep) === TUTORIAL_STEP_SUCCESS ||
          Math.floor(tutorialStep) === TUTORIAL2_STEP_START ||
          Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT_VIEW_OPEN ||
          Math.floor(tutorialStep) === TUTORIAL2_STEP_CONTEXT_VIEW_EXAMPLES ||
          Math.floor(tutorialStep) === TUTORIAL2_STEP_SUCCESS
        )
          ? <span className='tutorial-next-wait text-small'>Complete the instructions to continue</span>
          : <React.Fragment>

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

            <a className={classNames({
              'tutorial-prev': true,
              button: true,
              'button-variable-width': true
            })} disabled={tutorialStep === TUTORIAL_STEP_START} onClick={() => tutorialPrev(tutorialStep) }>Prev</a>

            <a className='tutorial-button button button-variable-width' onClick={tutorialNext}>{tutorialStep === TUTORIAL_STEP_SUCCESS || tutorialStep === TUTORIAL2_STEP_SUCCESS ? 'Finish' : 'Next'}</a>

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

  </div>
})

