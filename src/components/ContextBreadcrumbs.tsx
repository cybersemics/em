import classNames from 'classnames'
import { unescape as decodeCharacterEntities, isEqual } from 'lodash'
import React, { createRef, useMemo } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { CSSTransition, TransitionGroup } from 'react-transition-group'
import { css, cx } from '../../styled-system/css'
import { extendTap } from '../../styled-system/recipes'
import { SystemStyleObject } from '../../styled-system/types'
import Index from '../@types/IndexType'
import Path from '../@types/Path'
import ThoughtId from '../@types/ThoughtId'
import { HOME_TOKEN } from '../constants'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import simplifyPath from '../selectors/simplifyPath'
import editingValueStore from '../stores/editingValue'
import ellipsize from '../util/ellipsize'
import fastClick from '../util/fastClick'
import head from '../util/head'
import isRoot from '../util/isRoot'
import parentOf from '../util/parentOf'
import strip from '../util/strip'
import HomeLink from './HomeLink'
import Link from './Link'
import Superscript from './Superscript'

type OverflowChild = {
  id: ThoughtId
  value: string
  nodeRef: React.RefObject<HTMLElement>
  label?: string
  isOverflow?: boolean
}

type OverflowPath = OverflowChild[]

const superscriptCss = { position: 'relative', left: '-2px', top: '-3px' }

/** Ellipsizes thoughts in a path by thoughtsLimit and charLimit. Complexity: O(n), but does not work if thoughtsLimit or charLimit are undefined. */
const useEllipsizedThoughts = (
  path: Path,
  { disabled, thoughtsLimit, charLimit }: { disabled?: boolean; thoughtsLimit?: number; charLimit?: number },
): OverflowPath => {
  // calculate if overflow occurs during ellipsized view
  // 0 if thoughtsLimit is not defined
  const thoughtsOverflow = thoughtsLimit && path.length > thoughtsLimit ? path.length - thoughtsLimit + 1 : 0

  const editingValue = editingValueStore.useState()

  // convert the path to a list of thought values
  // if editing, use the live editing value
  const thoughtValuesLive = useSelector(
    state =>
      path.map(id =>
        editingValue && state.cursor && id === head(state.cursor)
          ? editingValue
          : ((getThoughtById(state, id)?.value || null) as string | null),
      ),
    isEqual,
  )

  // if charLimit is exceeded then replace the remaining characters with an ellipsis
  const charLimitedThoughts: OverflowPath = path.map((id, i) => {
    const value = thoughtValuesLive[i]
    return {
      // It is possible that the thought is no longer in state, in which case value will be null.
      // The component is hopefully being unmounted, so the value shouldn't matter as long as it does not error out.
      value: value ?? '',
      id,
      nodeRef: createRef(),
      // add ellipsized label
      ...(!disabled && value != null
        ? {
            label: strip(
              // subtract 2 so that additional '...' is still within the char limit
              value.length > charLimit! - 2 ? value.slice(0, charLimit! - 2) + '...' : value,
            ),
          }
        : {}),
    }
  })

  // after character limit is applied we need to remove the overflow thoughts if any and add isOverflow flag to render ellipsis at that position
  const ellipsizedThoughts: OverflowPath =
    thoughtsOverflow && !disabled
      ? charLimitedThoughts
          .slice(0, charLimitedThoughts.length - 1 - thoughtsOverflow)
          .concat({ isOverflow: true } as OverflowChild, charLimitedThoughts.slice(charLimitedThoughts.length - 1))
      : charLimitedThoughts

  return ellipsizedThoughts
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
      linkCssRaw?: SystemStyleObject
    }
  >(({ isOverflow, label, isDeleting, path, showDivider, onClickEllipsis, staticText, linkCssRaw }, ref) => {
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
            <HomeLink color='gray' size={16} className={css({ position: 'static' })} />
          ) : (
            <Link
              cssRaw={css.raw(linkCssRaw)}
              className={extendTap({ size: 'small' })}
              simplePath={simplePath}
              label={label}
            />
          ))}
        {!isDeleting && <Superscript simplePath={simplePath} css={superscriptCss} />}
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

/** Renders the ancestor chain of a path as links. */
const ContextBreadcrumbs = ({
  charLimit,
  classNamesObject,
  cssRaw,
  hideArchive,
  hidden,
  homeContext,
  path,
  staticText,
  thoughtsLimit,
  linkCssRaw,
}: {
  charLimit?: number
  classNamesObject?: Index<boolean>
  cssRaw?: SystemStyleObject
  /** Hide just the =archive thought, but show the rest of the path. */
  hideArchive?: boolean
  /**
   * Renders an invisible ContextBreadcrumbs.
   * Useful for ThoughtAnnotation spacing.
   */
  hidden?: boolean
  homeContext?: boolean
  path: Path
  /** Disables click on breadcrumb fragments. */
  staticText?: boolean
  thoughtsLimit?: number
  linkCssRaw?: SystemStyleObject
}) => {
  const [disabled, setDisabled] = React.useState(false)
  const simplePath = useSelector(state => simplifyPath(state, path), shallowEqual)
  const pathFiltered = useSelector(
    state => (hideArchive ? (path.filter(id => getThoughtById(state, id).value !== '=archive') as Path) : path),
    shallowEqual,
  )
  const ellipsizedThoughts = useEllipsizedThoughts(pathFiltered, { charLimit, disabled, thoughtsLimit })

  /** Clones the direct breadcrumb children to inject isDeleting animation state. */
  const factoryManager = (child: React.ReactElement) => {
    const updatedGrandChild = React.cloneElement(child.props.children, {
      ...child.props.children.props,
      isDeleting: !child.props.in,
    })

    return React.cloneElement(child, { ...child.props }, updatedGrandChild)
  }

  /** The list of ancestor paths: [a], [a, b], [a, b, c], etc. */
  const ancestors = useMemo(() => {
    return pathFiltered.map((id, i) => pathFiltered.slice(0, i + 1) as Path)
  }, [pathFiltered])

  const homeIconStyle: React.CSSProperties = { position: 'relative', left: -1, top: 2 }

  return (
    <div
      aria-label={hidden ? undefined : 'context-breadcrumbs'}
      style={hidden ? { visibility: 'hidden' } : {}}
      className={cx(
        classNames({
          'breadcrumbs context-breadcrumbs': true,
          ...classNamesObject,
        }),
        css(cssRaw),
      )}
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
          <HomeLink className={css({ position: 'static' })} color='gray' size={16} iconStyle={homeIconStyle} />
        ) : null
      ) : (
        <TransitionGroup childFactory={factoryManager}>
          {ellipsizedThoughts.map(({ isOverflow, id, label, nodeRef }, i) => {
            // Use index as key because we actually want all segments to the right to re-render.
            // Otherwise also it incorrectly animates a changed segment when moving the cursor to a sibling, which doesn't look as good as a direct replacement.
            // This way it will only animate when the length of the cursor changes.
            return (
              <CSSTransition key={i} nodeRef={nodeRef} timeout={600} classNames='fade-600'>
                <BreadCrumb
                  ref={nodeRef}
                  isOverflow={isOverflow}
                  label={label}
                  onClickEllipsis={() => setDisabled(true)}
                  path={ancestors[i]}
                  showDivider={i > 0}
                  staticText={staticText}
                  linkCssRaw={css.raw(
                    {
                      color: 'inherit',
                      textDecoration: 'none',
                      '&:active': { color: '#909090', WebkitTextStrokeWidth: '0.05em' },
                    },
                    linkCssRaw,
                  )}
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
