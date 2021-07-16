import React, { useState } from 'react'
import { connect } from 'react-redux'
import { isTouch } from '../browser'
import { formatKeyboardShortcut, globalShortcuts } from '../shortcuts'
import * as db from '../data-providers/dexie'
import { makeCompareByProp, sort } from '../util'
import { closeModal, toggleShortcutsDiagram, tutorial, tutorialStep as setTutorialStep } from '../action-creators'
import { getSetting } from '../selectors'
import { TUTORIAL2_STEP_START, TUTORIAL_STEP_START, TUTORIAL_STEP_SUCCESS } from '../constants'
import { Connected, GesturePath, Shortcut, State } from '../@types'

// components
import GestureDiagram from './GestureDiagram'
import Logs from './Logs'
import Modal from './Modal'
import { ActionButton } from './ActionButton'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = (state: State) => {
  const { showQueue, enableLatestShorcutsDiagram } = state
  return {
    showQueue,
    tutorialStep: +(getSetting(state, 'Tutorial Step') || 1),
    enableLatestShorcutsDiagram,
  }
}

/** Renders all of a shortcut's details as a table row. */
const ShortcutRows = (shortcut: Shortcut, i: number) => (
  <tr key={i}>
    <th>
      <b>{shortcut.label}</b>
      <p>{shortcut.description}</p>
    </th>
    <td>
      {isTouch && shortcut.gesture ? (
        // GesturePath[]
        <GestureDiagram path={shortcut.gesture as GesturePath} size={48} />
      ) : shortcut.keyboard ? (
        formatKeyboardShortcut(shortcut.keyboard)
      ) : null}
    </td>
  </tr>
)

/** Renders a table of shortcuts. */
const ShortcutTable = () => {
  // filter out shortcuts that do not exist on the current platform
  const shortcuts = sort(globalShortcuts, makeCompareByProp('name')).filter(
    shortcut => !shortcut.hideFromInstructions && (isTouch ? shortcut.gesture : shortcut.keyboard),
  )

  return (
    <table className='shortcuts'>
      <tbody>{shortcuts.map(ShortcutRows)}</tbody>
    </table>
  )
}

/** A modal that offers links to the tutorial, a list of shortcuts, and other helpful things. */
const ModalHelp = ({
  tutorialStep,
  showQueue,
  dispatch,
  enableLatestShorcutsDiagram,
}: Connected<ReturnType<typeof mapStateToProps>>) => {
  const [logs, setLogs] = useState<db.Log[] | null>(null)

  /** Toogle shortcuts diagram settings. */
  const toggleShortcutsDiagramSetting = () => dispatch(toggleShortcutsDiagram())

  /** Toggles the logs. Loads the logs if they have not been loaded yet. */
  const toggleLogs = async () => setLogs(logs ? null : await db.getLogs())

  /** Refreshes the page without using cache. */
  const refresh = () => {
    window.location = window.location // eslint-disable-line no-self-assign
  }

  return (
    <Modal
      id='help'
      title='Help'
      className='popup'
      actions={({ close }) => <ActionButton key='close' title='Close' onClick={() => close()} />}
    >
      <section className='popup-section'>
        <h2 className='modal-subtitle'>Tutorials</h2>

        <div className='modal-actions modal-actions-stack center'>
          <div>
            <a
              className='button'
              onClick={() => {
                dispatch([
                  tutorial({ value: true }),
                  // allow resume
                  // TODO: Allow resume for both tutorials
                  setTutorialStep({ value: tutorialStep > TUTORIAL_STEP_SUCCESS ? TUTORIAL_STEP_START : tutorialStep }),
                  closeModal(),
                ])
              }}
            >
              Part I: Intro
            </a>
          </div>
          <div>
            <a
              className='button'
              onClick={() => {
                dispatch([
                  tutorial({ value: true }),
                  // allow resume
                  setTutorialStep({ value: tutorialStep < TUTORIAL2_STEP_START ? TUTORIAL2_STEP_START : tutorialStep }),
                  closeModal(),
                ])
              }}
            >
              Part II: Contexts
            </a>
          </div>
        </div>
      </section>

      <h2 className='modal-subtitle'>{isTouch ? 'Gesture' : 'Keyboard'} Shortcuts</h2>

      <ShortcutTable />

      <h2 className='modal-subtitle modal-subtitle-compact'>Metaprogramming</h2>

      <code>=bullets</code>
      <p>
        Options: Bullets, None
        <br />
        Hide the bullets of a context. For a less bullety look.
      </p>

      <code>=drop</code>
      <p>
        Options: top, bottom
        <br />
        Controls where in a context an item is placed after drag-and-drop. Default: bottom.
      </p>

      <code>=focus</code>
      <p>
        Options: Normal, Zoom
        <br />
        When the cursor is on this thought, hide its parent and siblings for additional focus. Excellent for study time
        or when you have had too much coffee.
      </p>

      <code>=hidden</code>
      <p>Hide the thought.</p>

      <code>=immovable</code>
      <p>The thought cannot be moved. Not very useful.</p>

      <code>=label</code>
      <p>
        Display alternative text for a thought, but continue using the real text when linking contexts and sorting. The
        real text is hidden unless editing. Useful for nuisance words like "The", "A", and "Chrysanthemum".
      </p>

      <code>=note</code>
      <p>Display a note in smaller text underneath the thought. How pretty.</p>

      <code>=options</code>
      <p>A list of allowed subthoughts. We all have times when we need to be strict.</p>

      <code>=pin</code>
      <p>Keep a thought expanded, forever. Or at least until you unpin it.</p>

      <code>=pinChildren</code>
      <p>
        Options: true, false
        <br />
        Keep all of a thought's subthoughts expanded. A lot of pins.
      </p>

      <code>=publish</code>
      <p>Specify meta data for publishing the context as an article.</p>
      <ul>
        <li>
          <code>Byline</code>
          <p>A small byline of one or more lines to be displayed under the title.</p>
        </li>
        <li>
          <code>Email</code>
          <p>
            A gravatar email to display as a small avatar next to the Byline. Something professional, or perhaps
            something sexy?
          </p>
        </li>
        <li>
          <code>Title</code>
          <p>Override the title of the article when exported.</p>
        </li>
      </ul>

      <code>=readonly</code>
      <p>The thought cannot be edited, moved, or extended. Excellent for frustrating oneself.</p>

      <code>=src</code>
      <p>Import thoughts from a given URL. Accepts plaintext, markdown, and HTML. Very buggy, trust me.</p>

      <code>=style</code>
      <p>
        Set CSS styles on the thought. You might also consider =styleContainer, =children/=style, =grandchildren/=style.
      </p>

      <code>=uneditable</code>
      <p>The thought cannot be edited. How depressing.</p>

      <code>=unextendable</code>
      <p>New subthoughts may not be added to the thought.</p>

      <code>=view</code>
      <p>
        Options: Article, List, Table, Prose
        <br />
        Controls how the thought and its subthoughts are displayed. Use "Table" to create two columns, and "Prose" for
        longform writing. Default: List.
      </p>

      <h2 className='modal-subtitle'>Development Settings</h2>

      <form>
        <label onChange={toggleShortcutsDiagramSetting}>
          <input type='checkbox' checked={enableLatestShorcutsDiagram}></input> Enable gesture diagrams (touch screen){' '}
        </label>
      </form>

      <div className='text-small' style={{ marginTop: '2em', fontStyle: 'italic', opacity: 0.7 }}>
        <div>
          Context View icon by{' '}
          <a href='https://thenounproject.com/travisavery/collection/connection-power/?i=2184164'>Travis Avery</a> from
          the <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Export icon by{' '}
          <a href='https://www.flaticon.com/authors/those-icons' title='Those Icons'>
            Those Icons
          </a>{' '}
          from{' '}
          <a href='https://www.flaticon.com/' title='Flaticon'>
            www.flaticon.com
          </a>
        </div>
        <div>
          Export icon by <a href='https://thenounproject.com/tgtdesign18'>Mahesh Keshvala</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Feedback icon by <a href='https://thenounproject.com/deanmtam'>Dean Mocha</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Hidden Thoughts icon by <a href='https://thenounproject.com/search/?q=show%20hidden&i=1791510'>Joyce Lau</a>{' '}
          from the <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Indent icons by{' '}
          <a href='https://www.flaticon.com/authors/bqlqn' title='bqlqn'>
            bqlqn
          </a>{' '}
          from{' '}
          <a href='https://www.flaticon.com/' title='Flaticon'>
            flaticon.com
          </a>
        </div>
        <div>
          Note icon by <a href='https://thenounproject.com/iconsphere/collection/populars/?i=2321491'>iconsphere</a>{' '}
          from the <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Pin icon by <a href='https://thenounproject.com/search/?q=%22pin%20many%22&i=496735'>Hea Poh Lin</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Prose View icon by <a href='https://thenounproject.com/coquet_adrien'>Adrien Coquet</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Search icon by <a href='https://icons8.com/icon/7695/search'>Icons8</a>
        </div>
        <div>
          Subcategorize icons by <a href='https://thenounproject.com/term/circuit/1685927/'>Hare Krishna</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Table icon by{' '}
          <a href='https://thenounproject.com/icon54app/collection/table-light-icon-set/?i=2762107'>icon 54</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Undo and Redo Icons by{' '}
          <a href='https://www.flaticon.com/authors/pixel-perfect' title='Pixel perfect'>
            Pixel perfect
          </a>{' '}
          from{' '}
          <a href='https://www.flaticon.com/' title='Flaticon'>
            {' '}
            www.flaticon.com
          </a>
        </div>
        <div>
          Share icon by <a href='https://thenounproject.com/term/share/1058861/'>Тимур Минвалеев</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
        <div>
          Gift icon by <a href='https://thenounproject.com/search/?q=gift&i=2221484'> Sarote Impheng</a> from the{' '}
          <a href='https://thenounproject.com'>Noun Project</a>
        </div>
      </div>

      <br />

      <p>
        <a tabIndex={-1} onClick={refresh}>
          Refresh
        </a>
        <br />
        <a tabIndex={-1} onClick={toggleLogs}>
          Logs
        </a>
        {logs && <Logs logs={logs ?? []} />}
      </p>
    </Modal>
  )
}

export default connect(mapStateToProps)(ModalHelp)
