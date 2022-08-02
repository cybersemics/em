import classNames from 'classnames'
import React, { FC } from 'react'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import Index from '../@types/IndexType'
import SimplePath from '../@types/SimplePath'
import isRoot from '../util/isRoot'
import useEllipsizedThoughts from './ContextBreadcrumbs.useEllipsizedThoughts'
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

/** Renders single BreadCrumb. If isDeleting and no overflow, only renders divider dot. */
const BreadCrumb: FC<{
  id: string
  isDeleting?: boolean
  isOverflow?: boolean
  label?: string
  onClickEllipsis: () => void
  simplePath: SimplePath
  showDivider?: boolean
}> = ({ isOverflow, simplePath, label, isDeleting, id, showDivider, onClickEllipsis }) => {
  return !isOverflow ? (
    <span>
      {showDivider ? <span className='breadcrumb-divider'> • </span> : null}
      {!isDeleting && <Link simplePath={simplePath} label={label} />}
      {!isDeleting && <Superscript simplePath={simplePath} />}
    </span>
  ) : (
    <span>
      <span className='breadcrumb-divider'> • </span>
      <span onClick={onClickEllipsis} style={{ cursor: 'pointer' }}>
        {' '}
        ...{' '}
      </span>
    </span>
  )
}

/** Breadcrumbs for contexts within the context views. */
export const ContextBreadcrumbs = ({
  charLimit,
  classNamesObject,
  hidden,
  homeContext,
  simplePath,
  thoughtsLimit,
}: ContextBreadcrumbProps) => {
  const [disabled, setDisabled] = React.useState(false)
  const ellipsizedThoughts = useEllipsizedThoughts(simplePath, { charLimit, disabled, thoughtsLimit })

  /** Clones the direct breadcrumb children to inject isDeleting animation state. */
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
          {ellipsizedThoughts.map(({ isOverflow, id, label }, i) => {
            const ancestor = simplePath.slice(0, i + 1) as SimplePath

            return (
              <CSSTransition key={i} timeout={600} classNames='fade-600'>
                <BreadCrumb
                  id={id}
                  isOverflow={isOverflow}
                  label={label}
                  onClickEllipsis={() => setDisabled(true)}
                  simplePath={ancestor}
                  showDivider={i > 0}
                />
              </CSSTransition>
            )
          })}
        </TransitionGroup>
      )}
    </div>
  )
}

export default ContextBreadcrumbs
