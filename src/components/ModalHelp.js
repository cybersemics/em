import React from 'react'
import { connect } from 'react-redux'
import { isMobile } from '../browser.js'
import { formatKeyboardShortcut, globalShortcuts } from '../shortcuts.js'

// components
import Modal from './Modal.js'
import GestureDiagram from './GestureDiagram'

// util
import {
  getSetting,
  makeCompareByProp,
  sort,
} from '../util.js'

// constants
import {
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_SUCCESS,
  TUTORIAL2_STEP_START,
} from '../constants.js'

const mapStateToProps = ({ showQueue }) => ({
  showQueue,
  tutorialStep: +getSetting('Tutorial Step'),
})

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

const ModalHelp = connect(mapStateToProps)(({ queue, tutorialStep, showQueue, dispatch }) =>

  <Modal id='help' title='Help' className='popup'>

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

    <code>=immovable</code>
    <p>The thought cannot be moved.</p>

    <code>=label</code>
    <p>Display alternative text, but continue using the real text when linking contexts. Hide the real text unless editing.</p>

    <code>=note</code>
    <p>Display a note in smaller text underneath the thought.</p>

    <code>=options</code>
    <p>A list of allowed subthoughts.</p>

    <code>=readonly</code>
    <p>The thought cannot be edited, moved, or extended.</p>

    <code>=style</code>
    <p>Set CSS styles on the thought.</p>

    <code>=uneditable</code>
    <p>The thought cannot be edited.</p>

    <code>=unextendable</code>
    <p>New subthoughts may not be added to the thought.</p>

    <code>=view</code>
    <p>Values: List, Table, Prose<br />Controls how the thought and its subthoughts are displayed.</p>

    <div className='text-small' style={{ marginTop: '2em', fontStyle: 'italic', opacity: 0.7 }}>
      <div>Export icon by <a href="https://www.flaticon.com/authors/those-icons" title="Those Icons">Those Icons</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a></div>
      <div>Indent icons by <a href='https://www.flaticon.com/authors/bqlqn' title='bqlqn'>bqlqn</a> from <a href='https://www.flaticon.com/' title='Flaticon'>flaticon.com</a></div>
      <div>Search icon by <a href="https://icons8.com/icon/7695/search">Icons8</a></div>
      <div>Undo and Redo Icons by <a href="https://www.flaticon.com/authors/pixel-perfect" title="Pixel perfect">Pixel perfect</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a></div>
      <div>Context View icon by <a href='https://thenounproject.com/travisavery/collection/connection-power/?i=2184164'>Travis Avery</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
      <div>Subcategorize icons by <a href='hhttps://thenounproject.com/term/circuit/1685927/'>Hare Krishna</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
      <div>Prose View icon by <a href='https://thenounproject.com/coquet_adrien'>Adrien Coquet</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
      <div>Export icon by <a href='https://thenounproject.com/tgtdesign18'>Mahesh Keshvala</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
      <div>Table icon by <a href='https://thenounproject.com/icon54app/collection/table-light-icon-set/?i=2762107'>icon 54</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
      <div>Push Pin icon by<a href="https://www.flaticon.com/authors/freepik" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon"> www.flaticon.com</a></div>
      <div>Hidden Thoughts icon by <a href='https://thenounproject.com/search/?q=show%20hidden&i=1791510'>Joyce Lau</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
      <div>Note icon by <a href='https://thenounproject.com/iconsphere/collection/populars/?i=2321491'>iconsphere</a> from the <a href='https://thenounproject.com'>Noun Project</a></div>
    </div>

    <p><br /><a tabIndex='-1' onClick={() => window.location.reload()}>Refresh</a></p>

  </Modal>
)

export default ModalHelp
