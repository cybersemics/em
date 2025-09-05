import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { css } from '../../styled-system/css'
import { isSafari, isTouch, isiPhone } from '../browser'
import cursorStore from '../stores/cursor'

const isIOSSafari = isTouch && isiPhone && isSafari()

/**
 * CursorOverlay is a component that renders the cursor overlay for a thought bullet.
 */
export function CursorOverlay() {
  const bulletOverlayRadius = isIOSSafari ? 300 : 245

  return (
    <g key='placeholder-bullet-g' style={{ visibility: 'visible' }}>
      <ellipse
        ry={bulletOverlayRadius}
        rx={bulletOverlayRadius}
        cy='300'
        cx='300'
        className={css({
          stroke: 'highlight',
          fillOpacity: 0.25,
          fill: 'fg',
        })}
      />
    </g>
  )
}

/**
 * PlaceholderTreeNode is a component used to mimic behavior of TreeNode.
 * Any position changes from one Thought to another will be animated within this component.
 */
function PlaceholderTreeNode({ children }: { children?: React.ReactNode }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const { treeNode } = cursorStore.useState()

  const [targetSvg, setTargetSvg] = useState<SVGSVGElement | null>(null)

  React.useEffect(() => {
    if (!treeNode) return
    if (!containerRef.current) return

    const treenodeElement = treeNode as HTMLElement
    const container = containerRef.current

    // Copy all attributes from the first element (treeNode) to the container
    Array.from(treenodeElement.attributes).forEach(attr => {
      container.setAttribute(attr.name, attr.value)
    })

    // Clear existing content and copy the nested child from treeNode
    container.innerHTML = ''
    if (treenodeElement.firstElementChild) {
      const nestedChild = treenodeElement.firstElementChild.cloneNode(true) as HTMLElement

      container.appendChild(nestedChild)

      const svg = nestedChild.querySelector('span[aria-label="bullet"] svg') as SVGSVGElement | null
      setTargetSvg(svg)
    }
  }, [treeNode])

  return (
    <div key='placeholder-tree-node' ref={containerRef}>
      {targetSvg && ReactDOM.createPortal(children, targetSvg)}
    </div>
  )
}

/**
 * BulletCursorOverlay is a component used to animate the cursor overlay from the bullet.
 * This component also contains placeholders for other components to maintain consistency of cursor overlay position.
 **/
export default function BulletCursorOverlay() {
  return (
    <PlaceholderTreeNode>
      <CursorOverlay />
    </PlaceholderTreeNode>
  )
}
