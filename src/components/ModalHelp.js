import React, { useState } from 'react'
import { connect } from 'react-redux'
import { isMobile } from '../browser'
import { formatKeyboardShortcut, globalShortcuts } from '../shortcuts'
import * as db from '../db'

// components
import Modal from './Modal'
import GestureDiagram from './GestureDiagram'
import Logs from './Logs'

// util
import {
  makeCompareByProp,
  sort,
} from '../util'

// selectors
import { getSetting } from '../selectors'

// constants
import {
  TUTORIAL2_STEP_START,
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_SUCCESS,
} from '../constants'

// eslint-disable-next-line jsdoc/require-jsdoc
const mapStateToProps = state => {
  const { showQueue } = state
  return {
    showQueue,
    tutorialStep: +getSetting(state, 'Tutorial Step'),
  }
}

/** Renders all of a shortcut's details into a row. */
const ShortcutRows = () => sort(globalShortcuts, makeCompareByProp('name'))
  // filter out shortcuts that do not exist on the current platform
  .filter(shortcut => !shortcut.hideFromInstructions && (isMobile ? shortcut.gesture : shortcut.keyboard))
  .map((shortcut, i) =>
    <tr key={i}>
      <th>
        <b>{shortcut.name}</b>
        <p>{shortcut.description}</p>
      </th>
      <td>{isMobile
        ? <GestureDiagram path={shortcut.gesture} size={48} />
        : formatKeyboardShortcut(shortcut.keyboard)
      }</td>
    </tr>
  )

/** A modal that offers links to the tutorial, a list of shortcuts, and other helpful things. */
const ModalHelp = ({ tutorialStep, showQueue, dispatch }) => {

  const [logs, setLogs] = useState(null)

  /** Toggles the logs. Loads the logs if they have not been loaded yet. */
  const toggleLogs = async () =>
    setLogs(logs ? null : await db.getLogs())

  return <Modal id='help' title='Help' className='popup'>

    <section className='popup-section'>
      <h2 className='modal-subtitle'>Tutorials</h2>

      <div className='modal-actions center'>
        <p><a className='button' onClick={() => {
          dispatch({ type: 'tutorial', value: true })
          // allow resume
          // TODO: Allow resume for both tutorials
          dispatch({ type: 'tutorialStep', value: tutorialStep > TUTORIAL_STEP_SUCCESS ? TUTORIAL_STEP_START : tutorialStep })
          dispatch({ type: 'modalRemindMeLater', id: 'help' })
        }}>Part I: Intro</a></p>
        <p><a className='button' onClick={() => {
          dispatch({ type: 'tutorial', value: true })
          // allow resume
          dispatch({ type: 'tutorialStep', value: tutorialStep < TUTORIAL2_STEP_START ? TUTORIAL2_STEP_START : tutorialStep })
          dispatch({ type: 'modalRemindMeLater', id: 'help' })
        }}>Part II: Contexts</a></p>
      </div>
    </section>

    <h2 className='modal-subtitle'>{isMobile ? 'Gesture' : 'Keyboard'} Shortcuts</h2>

    <table className='shortcuts'>
      <tbody>
        <ShortcutRows />
      </tbody>
    </table>

    <h2 className='modal-subtitle modal-subtitle-compact'>Metaprogramming</h2>

    <code>=hidden</code>
    <p>Hide the thought.</p>

    <code>=bullets</code>
    <p>Options: Bullets, None<br/>
    Hide the bullets of a context.</p>

    <code>=focus</code>
    <p>Options: Normal, Zoom<br/>
    When the cursor is on this thought, hide parent and sibliings for additional focus.</p>

    <code>=immovable</code>
    <p>The thought cannot be moved.</p>

    <code>=label</code>
    <p>Display alternative text, but continue using the real text when linking contexts. Hide the real text unless editing.</p>

    <code>=note</code>
    <p>Display a note in smaller text underneath the thought.</p>

    <code>=options</code>
    <p>A list of allowed subthoughts.</p>

    <code>=pin</code>
    <p>Keep a thought expanded.</p>

    <code>=pinChildren</code>
    <p>Options: true, false<br/>
    Keep all of a thought's subthoughts expanded.</p>

    <code>=publish</code>
    <p>Specify meta data for publishing.</p>
    <ul>
      <li>
        <code>Byline</code>
        <p>A small byline of one or more lines to be displayed under the title.</p>
      </li>
      <li>
        <code>Email</code>
        <p>A gravatar email to display as a small avatar next to the Byline.</p>
      </li>
      <li>
        <code>Title</code>
        <p>Override the title of the article when exported.</p>
      </li>
    </ul>

    <code>=readonly</code>
    <p>The thought cannot be edited, moved, or extended.</p>

    <code>=src</code>
    <p>Import thoughts from a given URL. Accepts plaintext, markdown, and HTML.</p>

    <code>=style</code>
    <p>Set CSS styles on the thought. May also use =styleContainer, =children/=style, =grandchildren/=style.</p>

    <code>=uneditable</code>
    <p>The thought cannot be edited.</p>

    <code>=unextendable</code>
    <p>New subthoughts may not be added to the thought.</p>

    <code>=view</code>
    <p>Options: Article, List, Table, Prose<br />
    Controls how the thought and its subthoughts are displayed.</p>

    <div className='text-small' style={{ marginTop: '2em', fontStyle: 'italic', opacity: 0.7 }}>
      <div>Context View icon by <a href='https://thenounproject.com/travisavery/collection/connection-power/?i=2184164'>Travis Avery</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
      <div>Export icon by <a href="https://www.flaticon.com/authors/those-icons" title="Those Icons">Those Icons</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
      <div>Export icon by <a href='https://thenounproject.com/tgtdesign18'>Mahesh Keshvala</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
      <div>Hidden Thoughts icon by <a href='https://thenounproject.com/search/?q=show%20hidden&i=1791510'>Joyce Lau</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
      <div>Indent icons by <a href='https://www.flaticon.com/authors/bqlqn' title='bqlqn'>bqlqn</a> from <a href='https://www.flaticon.com/' title='Flaticon'>flaticon.com</a></div>
      <div>Note icon by <a href='https://thenounproject.com/iconsphere/collection/populars/?i=2321491'>iconsphere</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
      <div>Pin icon by <a href='https://thenounproject.com/search/?q=%22pin%20many%22&i=496735'>Hea Poh Lin</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
      <div>Prose View icon by <a href='https://thenounproject.com/coquet_adrien'>Adrien Coquet</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
      <div>Search icon by <a href="https://icons8.com/icon/7695/search">Icons8</a></div>
      <div>Subcategorize icons by <a href='hhttps://thenounproject.com/term/circuit/1685927/'>Hare Krishna</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
      <div>Table icon by <a href='https://thenounproject.com/icon54app/collection/table-light-icon-set/?i=2762107'>icon 54</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
      <div>Undo and Redo Icons by <a href="https://www.flaticon.com/authors/pixel-perfect" title="Pixel perfect">Pixel perfect</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a></div>
    </div>

    <br />

    <p>
      <a tabIndex='-1' onClick={() => window.location.reload()}>Refresh</a><br />
      <a tabIndex='-1' onClick={toggleLogs}>Logs</a>
      {logs && <Logs logs={logs} />}
    </p>

  </Modal>
}

export default connect(mapStateToProps)(ModalHelp)
