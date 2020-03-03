import React from 'react'
import { store } from '../store.js'

const Icon = ({ fill, size = 20, style }) => <svg className="icon" style={{ style }} width={size} height={size} viewBox="0 0 110 110">
  <path
    d="M97.073 7H13.53C10.49 7 8 9.48 8 12.51v84.01c0 3.03 2.489 5.51 5.53 5.51h83.543c3.041 0 5.53-2.48 5.53-5.51V12.51c0-3.03-2.489-5.51-5.53-5.51zm-85.51 89.52V23.837h41.364V98.48H13.53c-1.066 0-1.967-.897-1.967-1.96zm87.478 0c0 1.063-.901 1.96-1.968 1.96H57.677V23.838H99.04v72.681z"
    fill={fill || style.fill}
    fillRule="evenodd"
  />
</svg>

export default {
  id: 'toggleSplitView',
  name: 'Toggle Split View',
  description: 'Render two independent views for side-by-side editing.',
  svg: Icon,
  exec: () => {
    store.dispatch({ type: 'toggleSplitView', value: !store.getState().present.showSplitView })
  }
}
