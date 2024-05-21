import classNames from 'classnames'
import { unescape as decodeCharacterEntities } from 'lodash'
import React, { useMemo, useRef } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import { HOME_TOKEN } from '../constants'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import simplifyPath from '../selectors/simplifyPath'
import ellipsize from '../util/ellipsize'
import fastClick from '../util/fastClick'
import head from '../util/head'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
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
  path: Path
  // disables click on breadcrumb fragments
  staticText?: boolean
  thoughtsLimit?: number
}

/** Renders single BreadCrumb. If isDeleting and no overflow, only renders divider dot. */
const BreadCrumb = React.memo(
  React.forwardRef<
    HTMLSpanElement,
    {
      isDeleting?: boolean
      isOverflow?: boolean
      label?: string
      onClickEllipsis: () => void
      path: Path
      showDivider?: boolean
      staticText?: boolean
    }
  >(({ isOverflow, label, isDeleting, path, showDivider, onClickEllipsis, staticText }, ref) => {
    const simplePath = useSelector(state => simplifyPath(state, path), shallowEqual)
    const value = useSelector(state => getThoughtById(state, head(simplePath))?.value)
    const showContexts = useSelector(state => isContextViewActive(state, parentOf(path)))
    const delimiterStyle: React.CSSProperties = {
      fontSize: '0.8em',
      lineHeight: '16px',
      margin: '0 3px',
      verticalAlign: 1,
      userSelect: 'none',
    }
    return !isOverflow ? (
      <span ref={ref} style={{ fontSize: staticText ? '0.8em' : undefined }}>
        {/* possible delimiter symbols: ⇢ */}
        {showDivider ? <span style={delimiterStyle}> {showContexts ? '⇢' : '•'} </span> : null}
        {!isDeleting &&
          (staticText ? (
            ellipsize(decodeCharacterEntities(value))
          ) : label === HOME_TOKEN ? (
            <HomeLink color='gray' size={16} />
          ) : (
            <Link className='extend-tap-small' simplePath={simplePath} label={label} />
          ))}
        {!isDeleting && <Superscript simplePath={simplePath} />}
      </span>
    ) : (
      <span ref={ref}>
        <span style={delimiterStyle}> • </span>
        <span {...fastClick(onClickEllipsis)} style={{ cursor: 'pointer' }}>
          {' '}
          ...{' '}
        </span>
      </span>
    )
  }),
)

BreadCrumb.displayName = 'BreadCrumb'

/** Breadcrumbs for contexts within the context views. */
const ContextBreadcrumbs = ({
  charLimit,
  classNamesObject,
  hidden,
  homeContext,
  path,
  staticText,
  thoughtsLimit,
}: ContextBreadcrumbProps) => {
  const [disabled, setDisabled] = React.useState(false)
  const simplePath = useSelector(state => simplifyPath(state, path), shallowEqual)
  const ellipsizedThoughts = useEllipsizedThoughts(path, { charLimit, disabled, thoughtsLimit })
  const breadCrumbsRef = useRef<HTMLSpanElement>(null)

  /** Clones the direct breadcrumb children to inject isDeleting animation state. */
  const factoryManager = (child: React.ReactElement) => {
    const updatedGrandChild = React.cloneElement(child.props.children, {
      ...child.props.children.props,
      isDeleting: !child.props.in,
    })

    return React.cloneElement(child, { ...child.props }, updatedGrandChild)
  }

  const ancestors = useMemo(() => {
    return path.map((id, i) => path.slice(0, i + 1) as Path)
  }, [path])

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
          <HomeLink color='gray' size={16} style={{ position: 'relative', left: -1, top: 2 }} />
        ) : null
      ) : (
        <TransitionGroup childFactory={factoryManager}>
          {ellipsizedThoughts.map(({ isOverflow, id, label }, i) => {
            // Use index as key because we actually want all segments to the right to re-render.
            // Otherwise also it incorrectly animates a changed segment when moving the cursor to a sibling, which doesn't look as good as a direct replacement.
            // This way it will only animate when the length of the cursor changes.
            return (
              <CSSTransition key={i} nodeRef={breadCrumbsRef} timeout={600} classNames='fade-600'>
                <BreadCrumb
                  ref={breadCrumbsRef}
                  isOverflow={isOverflow}
                  label={label}
                  onClickEllipsis={() => setDisabled(true)}
                  path={ancestors[i]}
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
