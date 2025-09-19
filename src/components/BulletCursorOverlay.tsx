import React, { useState } from 'react'
import ReactDOM from 'react-dom'
import { css } from '../../styled-system/css'
import { isSafari, isTouch, isiPhone } from '../browser'

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

  const [targetSvg, setTargetSvg] = useState<SVGSVGElement | null>(null)

  const prevDomElementRef = React.useRef<HTMLElement | null>(null)

  React.useEffect(() => {
    const updateCursorNode = () => {
      if (!containerRef.current) return
      // Find the cursor TreeNode using the data-cursor attribute
      const cursorTreeNodes = document.querySelectorAll('div[data-cursor="true"]') as NodeListOf<HTMLElement>
      const cursorTreeNode = Array.from(cursorTreeNodes).find(node => node !== prevDomElementRef.current)
      if (!cursorTreeNode) return

      console.log('>>>', cursorTreeNode)
      const container = containerRef.current

      // Copy all attributes from the cursor TreeNode to the container (except data-cursor)
      Array.from(cursorTreeNode.attributes).forEach(attr => {
        if (attr.name !== 'data-cursor') {
          container.setAttribute(attr.name, attr.value)
        }
      })

      // Clear existing content and copy the nested child from cursor TreeNode
      container.innerHTML = ''
      container.style.visibility = 'hidden'
      if (cursorTreeNode.firstElementChild) {
        const nestedChild = cursorTreeNode.firstElementChild.cloneNode(true) as HTMLElement

        container.appendChild(nestedChild)

        const svg = nestedChild.querySelector('span[aria-label="bullet"] svg') as SVGSVGElement | null
        if (svg) {
          // Clear the SVG contents
          svg.innerHTML = ''
          svg.style.visibility = 'visible'
        }
        // console.log('svg', svg)
        setTargetSvg(svg)
        prevDomElementRef.current = cursorTreeNode
      }
    }

    // Initial update
    updateCursorNode()

    // Set up MutationObserver to watch for data-cursor attribute changes
    const observer = new MutationObserver(mutations => {
      let shouldUpdate = false

      mutations.forEach(mutation => {
        if (mutation.type === 'attributes') {
          // Update if data-cursor attribute changed
          if (mutation.attributeName === 'data-cursor') {
            shouldUpdate = true
            console.log('a ', mutation.attributeName)
          }
        }
      })

      if (shouldUpdate) {
        // setTimeout(() => {
        updateCursorNode()
        // }, 100)
      }
    })

    // Observe the entire document for attribute changes to data-cursor and style
    observer.observe(document, {
      attributes: true,
      attributeFilter: ['data-cursor'],
      subtree: true,
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div data-id='placeholder-tree-node' ref={containerRef}>
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
