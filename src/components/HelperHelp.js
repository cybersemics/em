import React from 'react'
import { connect } from 'react-redux'
import { isMobile } from '../browser.js'
import { formatKeyboardShortcut, globalShortcuts } from '../shortcuts.js'

// components
import { Helper } from './Helper.js'
import { GestureDiagram } from './GestureDiagram.js'

// util
import {
  makeCompareByProp,
} from '../util.js'

// constants
import {
  TUTORIAL_STEP_START,
  TUTORIAL2_STEP_START,
} from '../constants.js'

export const HelperHelp = connect(({ settings, showQueue }) => ({ settings, showQueue }))(({ settings, showQueue, dispatch }) =>
  <Helper id='help' title='Help' className='popup'>

    <section className='popup-section'>
      <h2 className='helper-subtitle'>Tutorials</h2>

      <div className='helper-actions center'>
        <p><a className='button' onClick={() => {
          dispatch({ type: 'tutorialStep', value: TUTORIAL_STEP_START })
          dispatch({ type: 'helperRemindMeLater', id: 'help' })
        }}>Part I: Intro</a></p>
        <p><a className='button' onClick={() => {
          dispatch({ type: 'tutorialStep', value: TUTORIAL2_STEP_START })
          dispatch({ type: 'helperRemindMeLater', id: 'help' })
        }}>Part II: Contexts</a></p>
      </div>
    </section>

    <h2 className='helper-subtitle'>{isMobile ? 'Gesture' : 'Keyboard'} Shortcuts</h2>

    <table className='shortcuts'>
      <tbody>
        {globalShortcuts().concat() // shallow copy for sort
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

    <h2 className='helper-subtitle helper-subtitle-compact'>Advanced</h2>
    <a tabIndex='-1'/* TODO: Add setting to enable tabIndex for accessibility */ onClick={() => dispatch({ type: 'settings', key: 'dark', value: !settings.dark })}>Light Mode</a><br/>
    <a tabIndex='-1' onClick={() => window.location.reload()}>Refresh</a><br/>
    <a tabIndex='-1' onClick={() => dispatch({ type: 'toggleQueue' })}>Queue ({Object.keys(JSON.parse(localStorage.queue || '{}')).length})</a><br/>
    {showQueue ? <textarea className='code' readOnly value={
      JSON.stringify(JSON.parse(localStorage.queue || '{}'), null, 2)
    }></textarea> : null}


  </Helper>
)
