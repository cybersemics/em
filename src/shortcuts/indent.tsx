import React, { Dispatch } from 'react'
import { Icon as IconType, Shortcut } from '../types'
import { isDocumentEditable } from '../util'
import { Action } from 'redux'
import moveCursorForward from './moveCursorForward'

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ fill = 'black', size = 20, style }: IconType) => <svg version='1.1' className='icon' xmlns='http://www.w3.org/2000/svg' width={size} height={size} fill={fill} style={style} viewBox='0 0 64 64' enableBackground='new 0 0 64 64'>
  <path d='m10 12h44c1.104 0 2-.896 2-2s-.896-2-2-2h-44c-1.104 0-2 .896-2 2s.896 2 2 2z' />
  <path d='m54 52h-44c-1.104 0-2 .896-2 2s.896 2 2 2h44c1.104 0 2-.896 2-2s-.896-2-2-2z' />
  <path d='m54 19h-20c-1.104 0-2 .896-2 2s.896 2 2 2h20c1.104 0 2-.896 2-2s-.896-2-2-2z' />
  <path d='m54 30h-20c-1.104 0-2 .896-2 2s.896 2 2 2h20c1.104 0 2-.896 2-2s-.896-2-2-2z' />
  <path d='m54 41h-20c-1.104 0-2 .896-2 2s.896 2 2 2h20c1.104 0 2-.896 2-2s-.896-2-2-2z' />
  <path d='m10 34h11.172l-.005.005c-1.201 1.201-2.196 2.581-2.956 4.101-.494.988-.094 2.189.895 2.684.287.143.592.21.892.21.734 0 1.44-.404 1.791-1.105.567-1.135 1.31-2.164 2.206-3.062l3.419-3.419c.781-.781.781-2.047 0-2.828l-3.419-3.419c-.897-.898-1.64-1.928-2.206-3.061-.494-.987-1.692-1.391-2.684-.895-.987.494-1.389 1.695-.895 2.683.759 1.519 1.753 2.898 2.956 4.101l.006.005h-11.172c-1.104 0-2 .896-2 2s.896 2 2 2z' />
</svg>

const indentShortcut: Shortcut = {
  id: 'indent',
  name: 'Indent',
  description: `Move the current thought "in" (to the end of the previous thought). No surprises here.`,
  overlay: {
    keyboard: moveCursorForward.keyboard,
  },
  svg: Icon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch: Dispatch<Action>) => dispatch({ type: 'indent' })
}

export default indentShortcut
