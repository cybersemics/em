import { unescape as decodeCharacterEntities, isEqual } from 'lodash'
import React, { createRef, useMemo } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { TransitionGroup } from 'react-transition-group'
import { css } from '../../styled-system/css'
import { extendTapRecipe } from '../../styled-system/recipes'
import { ColorToken, token } from '../../styled-system/tokens'
import { SystemStyleObject } from '../../styled-system/types'
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
import FadeTransition from './FadeTransition'
import HomeLink from './HomeLink'
import Link from './Link'
import Superscript from './Superscript'

type OverflowChild = {
  id: ThoughtId
  value: string
  nodeRef: React.RefObject<HTMLElement | null>
  label?: string
  isOverflow?: boolean
}

type OverflowPath = OverflowChild[]

type ContextBreadcrumbsVariant = 'small' | 'default'

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
      <span ref={ref} className={css({ fontSize: staticText ? '0.8em' : undefined })}>
        {/* possible delimiter symbols: ⇢ */}
        {showDivider ? <span style={delimiterStyle}> {showContexts ? '⇢' : '•'} </span> : null}
        {!isDeleting &&
          (staticText ? (
            ellipsize(decodeCharacterEntities(value))
          ) : label === HOME_TOKEN ? (
            <HomeLink color={token('colors.gray50')} size={16} className={css({ position: 'static' })} />
          ) : (
            <Link
              cssRaw={css.raw(linkCssRaw)}
              className={extendTapRecipe({ size: 'small' })}
              simplePath={simplePath}
              label={label}
            />
          ))}
        {!isDeleting && (
          <Superscript simplePath={simplePath} cssRaw={css.raw({ position: 'relative', left: '-2px', top: '-3px' })} />
        )}
      </span>
    ) : (
      <span ref={ref}>
        <span style={delimiterStyle}> • </span>
        <span {...fastClick(onClickEllipsis)} className={css({ cursor: 'pointer' })}>
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
  hideArchive,
  hidden,
  homeContext,
  path,
  staticText,
  thoughtsLimit,
  linkCssRaw,
  variant = 'default',
  color,
}: {
  charLimit?: number
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
  variant?: ContextBreadcrumbsVariant
  color?: ColorToken
}) => {
  const [disabled, setDisabled] = React.useState(false)
  const simplePath = useSelector(state => simplifyPath(state, path), shallowEqual)
  const pathFiltered = useSelector(
    state => (hideArchive ? (path.filter(id => getThoughtById(state, id)?.value !== '=archive') as Path) : path),
    shallowEqual,
  )
  const ellipsizedThoughts = useEllipsizedThoughts(pathFiltered, { charLimit, disabled, thoughtsLimit })

  /** Clones the direct breadcrumb children to inject isDeleting animation state. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const factoryManager = (child: React.ReactElement<any>) => {
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

  // If variant is small, use 14px font size, otherwise use 0.867rem which scales with the user's font size
  const fontSize = variant === 'default' ? '0.867rem' : '14px'

  return (
    <div
      aria-label={hidden ? undefined : 'context-breadcrumbs'}
      className={css({
        fontSize,
        color: color || 'gray66',
        minHeight: `${fontSize}`,
        visibility: hidden ? 'hidden' : undefined,
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
          <HomeLink
            className={css({ position: 'static' })}
            color={token('colors.gray50')}
            size={16}
            iconStyle={homeIconStyle}
          />
        ) : null
      ) : (
        <TransitionGroup childFactory={factoryManager}>
          {ellipsizedThoughts.map(({ isOverflow, label, nodeRef }, i) => {
            // Use index as key because we actually want all segments to the right to re-render.
            // Otherwise also it incorrectly animates a changed segment when moving the cursor to a sibling, which doesn't look as good as a direct replacement.
            // This way it will only animate when the length of the cursor changes.
            return (
              <FadeTransition type='fast' key={i} id={i} nodeRef={nodeRef}>
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
                      '&:active': { color: 'activeBreadCrumb', WebkitTextStrokeWidth: '0.05em' },
                    },
                    linkCssRaw,
                  )}
                />
              </FadeTransition>
            )
          })}
        </TransitionGroup>
      )}
    </div>
  )
}

export default ContextBreadcrumbs
