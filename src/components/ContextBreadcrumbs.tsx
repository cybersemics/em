import classNames from 'classnames'
import React, { FC } from 'react'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import Index from '../@types/IndexType'
import SimplePath from '../@types/SimplePath'
import ThoughtId from '../@types/ThoughtId'
import getThoughtById from '../selectors/getThoughtById'
import { store } from '../store'
import ancestors from '../util/ancestors'
import isRoot from '../util/isRoot'
import strip from '../util/strip'
import HomeLink from './HomeLink'
import Link from './Link'
import Superscript from './Superscript'

export interface ContextBreadcrumbProps {
  homeContext?: boolean
  simplePath: SimplePath
  thoughtsLimit?: number
  charLimit?: number
  classNamesObject?: Index<boolean>
  // renders an invisible ContextBreadcrumbs
  // useful for ThoughtAnnotation spacing
  hidden?: boolean
}

type OverflowChild = {
  id: ThoughtId
  value: string
  label?: string
  isOverflow?: boolean
}

type OverflowPath = OverflowChild[]

/** Breadcrumbs for contexts within the context views. */
export const ContextBreadcrumbs = ({
  hidden,
  homeContext,
  simplePath,
  thoughtsLimit,
  charLimit,
  classNamesObject,
}: ContextBreadcrumbProps) => {
  // if thoughtsLimit or charLimit is not passed , the default value of ellipsize will be false and component will have default behaviour
  const [ellipsize, setEllipsize] = React.useState(thoughtsLimit !== undefined && charLimit !== undefined)

  const state = store.getState()

  // calculate if the overflow occurs during ellipsized view
  // 0 if thoughtsLimit is not defined
  const overflow = simplePath.length > thoughtsLimit! ? simplePath.length - thoughtsLimit! + 1 : 0

  // if charLimit is exceeded then replace the remaining characters by ellipsis
  const charLimitedArray: OverflowPath = simplePath.map(id => {
    const thought = getThoughtById(state, id)
    return {
      value: thought.value,
      id,
      // add ellipsized label
      ...(ellipsize
        ? {
            label: strip(
              // subtract 2 so that additional '...' is still within the char limit
              thought.value.length > charLimit! - 2 ? thought.value.substr(0, charLimit! - 2) + '...' : thought.value,
            ),
          }
        : {}),
    }
  })

  // after character limit is applied we need to remove the overflow thoughts if any and add isOverflow flag to render ellipsis at that position
  const overflowArray: OverflowPath =
    ellipsize && overflow
      ? charLimitedArray
          .slice(0, charLimitedArray.length - 1 - overflow)
          .concat({ isOverflow: true } as OverflowChild, charLimitedArray.slice(charLimitedArray.length - 1))
      : charLimitedArray

  /** Renders BreadCrumbs that has access to isDeleting prop. */
  const BreadCrumbs: FC<{
    isOverflow?: boolean
    subthoughts: SimplePath
    label?: string
    isDeleting?: boolean
    id: string
    index: number
  }> = ({ isOverflow, subthoughts, label, isDeleting, id, index }) => {
    return !isOverflow ? (
      <span>
        {index > 0 ? <span className='breadcrumb-divider'> • </span> : null}
        {subthoughts && !isDeleting && <Link simplePath={subthoughts} label={label} />}
        {subthoughts && !isDeleting && <Superscript simplePath={subthoughts} />}
      </span>
    ) : (
      <span>
        <span className='breadcrumb-divider'> • </span>
        <span onClick={() => setEllipsize(false)} style={{ cursor: 'pointer' }}>
          {' '}
          ...{' '}
        </span>
      </span>
    )
  }

  /** Note: This function clones the direct breadcrumb children to inject isDeleting animation state. */
  const factoryManager = (child: React.ReactElement) => {
    const updatedGrandChild = React.cloneElement(child.props.children, {
      ...child.props.children.props,
      isDeleting: !child.props.in,
    })

    return React.cloneElement(child, { ...child.props }, updatedGrandChild)
  }

  return (
    <div
      aria-label={hidden ? undefined : 'context-breadcrumbs'}
      style={hidden ? { visibility: 'hidden' } : {}}
      className={classNames({
        'breadcrumbs context-breadcrumbs': true,
        ...classNamesObject,
      })}
    >
      {isRoot(simplePath) ? (
        /*
      If the path is the root context, check homeContext which is true if the context is directly in the root (in which case the HomeLink is already displayed as the thought)

      For example:

        - a
        - b
          - a
        - c
          - d
            - a

      Activating the context view on "a" will show three contexts: ROOT, b, and c/d.

      - The ROOT context will render the HomeLink as a thought. No breadcrumbs are displayed.
      - The "b" context will render "b" as a thought and the HomeLink as the breadcrumbs.
      - The "c/d" context will render "d" as a thought and "c" as the breadcrumbs.
    */
        !homeContext ? (
          <HomeLink color='gray' size={16} style={{ position: 'relative', left: -5, top: 2 }} />
        ) : null
      ) : (
        <TransitionGroup childFactory={factoryManager}>
          {overflowArray.map(({ isOverflow, id, label }, i) => {
            const subthoughts = ancestors(simplePath, id) as SimplePath

            return (
              <CSSTransition key={i} timeout={600} classNames='fade-600'>
                <BreadCrumbs isOverflow={isOverflow} subthoughts={subthoughts} label={label} id={id} index={i} />
              </CSSTransition>
            )
          })}
        </TransitionGroup>
      )}
    </div>
  )
}

export default ContextBreadcrumbs
