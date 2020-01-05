import React from 'react'
import { store } from '../store.js'
import { exportContext } from '../util/exportContext.js'
import { pathToContext } from '../util/pathToContext.js'
import { download } from '../util/download.js'

const Icon = ({ fill = 'black', size = 20 }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} style={{ fill }} viewBox="0 0 551.13 551.13" enableBackground="new 0 0 551.13 551.13">
    <path d="m465.016 172.228h-51.668v34.446h34.446v310.011h-344.457v-310.011h34.446v-34.446h-51.669c-9.52 0-17.223 7.703-17.223 17.223v344.456c0 9.52 7.703 17.223 17.223 17.223h378.902c9.52 0 17.223-7.703 17.223-17.223v-344.456c0-9.52-7.703-17.223-17.223-17.223z"/><path d="m258.342 65.931v244.08h34.446v-244.08l73.937 73.937 24.354-24.354-115.514-115.514-115.514 115.514 24.354 24.354z"/>
</svg>

export default {
  id: 'exportContext',
  name: 'Export Context',
  description: 'Export the current context as plaintext',
  svg: Icon,
  exec: () => {
    const { cursor } = store.getState()
    if (cursor) {
      const exported = exportContext(pathToContext(cursor), 'plaintext')
      download(exported, 'em.txt', 'text/plain')
    }
  }
}
