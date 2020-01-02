import React from 'react'
import { store } from '../store.js'

// util
import {
  getRankAfter,
  contextOf,
  restoreSelection,
  rootedContextOf,
  headValue,
  unroot,
} from '../util.js'

const outdentSVG = ({ fill = 'black', size = 20 }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} style={{ fill }} viewBox="0 0 64 64" enableBackground="new 0 0 64 64">
  <path d="m54 8h-44c-1.104 0-2 .896-2 2s.896 2 2 2h44c1.104 0 2-.896 2-2s-.896-2-2-2z"/>
  <path d="m54 52h-44c-1.104 0-2 .896-2 2s.896 2 2 2h44c1.104 0 2-.896 2-2s-.896-2-2-2z"/>
  <path d="m54 19h-20c-1.104 0-2 .896-2 2s.896 2 2 2h20c1.104 0 2-.896 2-2s-.896-2-2-2z"/>
  <path d="m54 30h-20c-1.104 0-2 .896-2 2s.896 2 2 2h20c1.104 0 2-.896 2-2s-.896-2-2-2z"/>
  <path d="m54 41h-20c-1.104 0-2 .896-2 2s.896 2 2 2h20c1.104 0 2-.896 2-2s-.896-2-2-2z"/>
  <path d="m17.789 25.895c.494-.988.093-2.189-.895-2.684-.987-.494-2.189-.094-2.684.895-.567 1.136-1.31 2.165-2.206 3.062l-3.419 3.419c-.781.781-.781 2.047 0 2.828l3.419 3.419c.896.896 1.639 1.926 2.206 3.062.352.7 1.058 1.104 1.791 1.104.301 0 .606-.067.893-.211.988-.494 1.388-1.695.895-2.684-.761-1.521-1.755-2.9-2.956-4.101l-.005-.004h11.172c1.104 0 2-.896 2-2s-.896-2-2-2h-11.172l.005-.005c1.201-1.2 2.195-2.58 2.956-4.1z"/>
</svg>

export default {
  id: 'outdent',
  name: 'De-indent',
  description: `Move the current thought to the next sibling of its context. Really should be called "dedent".`,
  keyboard: { key: 'Tab', shift: true },
  svg: outdentSVG,
  exec: e => {
    const { cursor } = store.getState()
    if (cursor && cursor.length > 1) {

      // store selection offset before existingThoughtMove is dispatched
      const offset = window.getSelection().focusOffset

      const cursorNew = unroot(rootedContextOf(contextOf(cursor)).concat({
          value: headValue(cursor),
          rank: getRankAfter(contextOf(cursor))
        }))

      store.dispatch({
        type: 'existingThoughtMove',
        oldPath: cursor,
        newPath: cursorNew
      })

      restoreSelection(cursorNew, { offset })
    }
  }
}
