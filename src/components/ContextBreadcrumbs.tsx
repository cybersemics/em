import classNames from 'classnames'
import React, { FC } from 'react'
import { useSelector } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import Index from '../@types/IndexType'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import getThoughtById from '../selectors/getThoughtById'
import decodeCharacterEntities from '../util/decodeCharacterEntities'
import ellipsize from '../util/ellipsize'
import head from '../util/head'
import isRoot from '../util/isRoot'
import useEllipsizedThoughts from './ContextBreadcrumbs.useEllipsizedThoughts'
import HomeLink from './HomeLink'
import Link from './Link'
import Superscript from './Superscript'

export interface ContextBreadcrumbProps {
  charLimit?: number
  classNamesObject?: Index<boolean>
  // renders an invisible ContextBreadcrumbs
  // useful for ThoughtAnnotation spacing
  hidden?: boolean
  homeContext?: boolean
  simplePath: SimplePath
  // disables click on breadcrumb fragments
  staticText?: boolean
  thoughtsLimit?: number
}

/** Renders single BreadCrumb. If isDeleting and no overflow, only renders divider dot. */
const BreadCrumb: FC<{
  isDeleting?: boolean
  isOverflow?: boolean
  label?: string
  onClickEllipsis: () => void
  simplePath: SimplePath
  showDivider?: boolean
  staticText?: boolean
}> = ({ isOverflow, simplePath, label, isDeleting, showDivider, onClickEllipsis, staticText }) => {
  const value = useSelector((state: State) => getThoughtById(state, head(simplePath))?.value)
  return !isOverflow ? (
    <span style={{ fontSize: staticText ? '0.8em' : undefined }}>
      {showDivider ? <span className='breadcrumb-divider'> • </span> : null}
      {!isDeleting &&
        (staticText ? ellipsize(decodeCharacterEntities(value)) : <Link simplePath={simplePath} label={label} />)}
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
const ContextBreadcrumbs = ({
  charLimit,
  classNamesObject,
  hidden,
  homeContext,
  simplePath,
  staticText,
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

            // Use index as key because we actually want all segments to the right to re-render.
            // Otherwise also it incorrectly animates a changed segment when moving the cursor to a sibling, which doesn't look as good as a direct replacement.
            // This way it will only animate when the length of the cursor changes.
            return (
              <CSSTransition key={i} timeout={600} classNames='fade-600'>
                <BreadCrumb
                  isOverflow={isOverflow}
                  label={label}
                  onClickEllipsis={() => setDisabled(true)}
                  simplePath={ancestor}
                  showDivider={i > 0}
                  staticText={staticText}
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
