import React from 'react'
import { connect } from 'react-redux'
import { isMobile } from '../browser.js'
import { formatKeyboardShortcut, globalShortcuts } from '../shortcuts.js'

// components
import { Modal } from './Modal.js'
import { GestureDiagram } from './GestureDiagram.js'

// util
import {
  makeCompareByProp,
} from '../util.js'

// constants
import {
  TUTORIAL_STEP_START,
  TUTORIAL_STEP_SUCCESS,
  TUTORIAL2_STEP_START,
} from '../constants.js'

export const ModalHelp = connect(({ settings, showQueue }) => ({
  settings,
  showQueue,
}))(({ queue, settings, showQueue, dispatch }) =>
  <Modal id='help' title='Help' className='popup'>

    <section className='popup-section'>
      <h2 className='modal-subtitle'>Tutorials</h2>

      <div className='modal-actions center'>
        <p><a className='button' onClick={() => {
          dispatch({ type: 'tutorial', value: true })
          // allow resume
          // TODO: Allow resume for both tutorials
          dispatch({ type: 'tutorialStep', value: settings.tutorialStep > TUTORIAL_STEP_SUCCESS ? TUTORIAL_STEP_START : settings.tutorialStep })
          dispatch({ type: 'modalRemindMeLater', id: 'help' })
        }}>Part I: Intro</a></p>
        <p><a className='button' onClick={() => {
          dispatch({ type: 'tutorial', value: true })
          // allow resume
          dispatch({ type: 'tutorialStep', value: settings.tutorialStep < TUTORIAL2_STEP_START ? TUTORIAL2_STEP_START : settings.tutorialStep })
          dispatch({ type: 'modalRemindMeLater', id: 'help' })
        }}>Part II: Contexts</a></p>
      </div>
    </section>

    <h2 className='modal-subtitle'>{isMobile ? 'Gesture' : 'Keyboard'} Shortcuts</h2>

    <table className='shortcuts'>
      <tbody>
        {globalShortcuts() // eslint-disable-line fp/no-mutating-methods
          .concat() // shallow copy for sort
          .sort(makeCompareByProp('name'))
          // filter out shortcuts that do not exist for the current platform
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
        }
      </tbody>
    </table>

    <h2 className='modal-subtitle modal-subtitle-compact'>Advanced</h2>
    <a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ onClick={() => dispatch({ type: 'settings', key: 'dark', value: !settings.dark })}>{settings.dark ? 'Light' : 'Dark'} Mode</a><br/>
    <a tabIndex='-1' onClick={() => window.location.reload()}>Refresh</a><br/>
    {showQueue ? <textarea className='code' style={{ fontSize: '10px' }} readOnly value={queue}></textarea> : null}

  </Modal>
)
