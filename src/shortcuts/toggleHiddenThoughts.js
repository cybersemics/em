import React from 'react'
import { store } from '../store.js'

const Icon = ({ fill, size = 20, style }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={fill} style={style} viewBox="0 0 100 100">
  <g>
    <path fillRule="evenodd" clipRule="evenodd" d="M13.4121 6.125C13.4121 8.33398 11.6213 10.125 9.41211 10.125C7.20288 10.125 5.41211 8.33398 5.41211 6.125C5.41211 3.91602 7.20288 2.125 9.41211 2.125C11.6213 2.125 13.4121 3.91602 13.4121 6.125ZM12.2622 6.125C12.2622 7.69922 10.9861 8.9751 9.41211 8.9751C7.83813 8.9751 6.56201 7.69922 6.56201 6.125C6.56201 4.55078 7.83813 3.2749 9.41211 3.2749C10.9861 3.2749 12.2622 4.55078 12.2622 6.125Z" transform="translate(10.3604 23.5) scale(4)" fill={fill || style.fill} />
    <path fillRule="evenodd" clipRule="evenodd" d="M9.41211 0C4.15112 0 1.35474 3.40039 0.331787 5C-0.110596 5.69189 -0.110596 6.55811 0.331787 7.25C1.35474 8.84961 4.15112 12.25 9.41211 12.25C14.6731 12.25 17.4695 8.84961 18.4924 7.25C18.9348 6.55811 18.9348 5.69189 18.4924 5C17.4695 3.40039 14.6731 0 9.41211 0ZM1.38501 5.67334C2.30688 4.23145 4.77124 1.25 9.41211 1.25C14.053 1.25 16.5171 4.23145 17.4392 5.67334C17.6191 5.95459 17.6191 6.29541 17.4392 6.57666C16.5171 8.01855 14.053 11 9.41211 11C4.77124 11 2.30688 8.01855 1.38501 6.57666C1.20508 6.29541 1.20508 5.95459 1.38501 5.67334Z" transform="translate(10.3604 23.5) scale(4)" fill={fill || style.fill} />
    <path fillRule="evenodd" clipRule="evenodd" d="M14.4419 0.441941C14.686 0.686019 14.686 1.08175 14.4419 1.32583L1.32583 14.4419C1.08175 14.686 0.686019 14.686 0.441941 14.4419V14.4419C0.197864 14.1979 0.197864 13.8021 0.441941 13.5581L13.5581 0.441942C13.8021 0.197864 14.1979 0.197864 14.4419 0.441941V0.441941Z" transform="translate(18.2324 18.2324) scale(4)" fill={fill || style.fill} />
  </g>
</svg>

export default {
  id: 'toggleHiddenThoughts',
  name: 'Toggle Hidden Thoughts',
  description: 'Show or hide hidden thoughts.',
  svg: Icon,
  exec: () => {
    store.dispatch({ type: 'toggleHiddenThoughts' })
  }
}
