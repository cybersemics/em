import _ from 'lodash'
import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CSSTransition from 'react-transition-group/CSSTransition'
import { css, cx } from '../../styled-system/css'
import { dropHover } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import DragThoughtZone from '../@types/DragThoughtZone'
import SimplePath from '../@types/SimplePath'
import { toggleUserSettingActionCreator as toggleUserSetting } from '../actions/toggleUserSetting'
import { Settings } from '../constants'
import useDragAndDropFavorites from '../hooks/useDragDropFavorites'
import useDragHold from '../hooks/useDragHold'
import { getLexeme } from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import getUserSetting from '../selectors/getUserSetting'
import thoughtToPath from '../selectors/thoughtToPath'
import durations from '../util/durations'
import fastClick from '../util/fastClick'
import head from '../util/head'
import nonNull from '../util/nonNull'
import Checkbox from './Checkbox'
import ThoughtLink from './ThoughtLink'
import FavoritesIcon from './icons/FavoritesIcon'

/**
 * Drag and Drop Favorites component.
 */
const DragAndDropFavorite = ({
  disableDragAndDrop,
  hideContext,
  simplePath,
}: {
  hideContext?: boolean
  disableDragAndDrop?: boolean
  simplePath: SimplePath
}) => {
  const { dragSource, dropTarget, isDragging, isHovering } = useDragAndDropFavorites({
    disableDragAndDrop,
    simplePath,
    path: simplePath,
  })
  const dragHoldResult = useDragHold({ isDragging, simplePath, sourceZone: DragThoughtZone.Favorites })

  return (
    // Set overflow:auto so the drop target fully wraps its contents.
    // Otherwise the context-breadcrumbs margin-top will leak out and create a dead zone where the favorite cannot be dropped.
    <div {...dragHoldResult.props} className={css({ overflow: 'auto' })} ref={node => dragSource(dropTarget(node))}>
      {!disableDragAndDrop && isHovering && (
        <span
          className={cx(
            dropHover(),
            css({
              backgroundColor: 'highlight',
              marginLeft: 0,
              marginTop: '-0.4em',
              width: 'calc(100% - 4em)',
            }),
          )}
        />
      )}
      <ThoughtLink
        hideContext={hideContext}
        path={simplePath}
        styleLink={{
          ...(!disableDragAndDrop &&
            (isDragging || dragHoldResult.isPressed
              ? {
                  color: token('colors.highlight'),
                  fontWeight: 'bold',
                }
              : undefined)),
        }}
      />
    </div>
  )
}

/** Drop target for end of the favorites list. */
const DropEnd = ({ disableDragAndDrop }: { disableDragAndDrop?: boolean }) => {
  const { dropTarget, isHovering } = useDragAndDropFavorites({
    disableDragAndDrop,
  })

  return (
    <div className={css({ height: '4em' })} ref={dropTarget}>
      <span
        className={cx(
          dropHover(),
          css({
            marginLeft: 0,
            marginTop: 0,
            width: 'calc(100% - 4em)',
            background: isHovering ? 'rgba(155, 170, 220, 1)' : undefined,
          }),
        )}
      />
    </div>
  )
}

/** Favorites Options toggle link and list of options. */
const FavoritesOptions = ({
  setShowOptions,
  showOptions,
}: {
  setShowOptions: (value: boolean) => void
  showOptions?: boolean
}) => {
  const dispatch = useDispatch()
  const hideContexts = useSelector(getUserSetting(Settings.favoritesHideContexts))
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <div className={css({ marginBottom: '0.5em', marginLeft: 2 })}>
      {/* Show Options toggle */}
      <div className={css({ marginLeft: '1em' })}>
        <span
          {...fastClick(() => setShowOptions(!showOptions))}
          className={css({
            color: '#444',
            cursor: 'pointer',
            fontSize: '0.7em',
            fontWeight: 'bold',
            position: 'relative',
          })}
        >
          <span
            className={css({
              display: 'inline-block',
              transform: showOptions ? `rotate(90deg)` : `rotate(0deg)`,
              transition: `transform {durations.veryFastDuration} ease-out`,
              // avoid position:absolute to trivially achieve correct vertical alignment with text
              marginLeft: '-1em',
            })}
          >
            ▸
          </span>{' '}
          <span>OPTIONS</span>
        </span>
      </div>

      <div className={css({ overflow: 'hidden' })}>
        <CSSTransition
          in={showOptions}
          nodeRef={formRef}
          timeout={durations.get('veryFastDuration')}
          classNames='slidedown'
          unmountOnExit
        >
          <form
            ref={formRef}
            className={css({ fontSize: 'sm', backgroundColor: '#3e3e3e', borderRadius: '0.5em', padding: '1em' })}
          >
            <Checkbox
              checked={!hideContexts}
              title='Show full contexts'
              onChange={() => {
                dispatch(toggleUserSetting({ key: Settings.favoritesHideContexts }))
              }}
            />
          </form>
        </CSSTransition>
      </div>
    </div>
  )
}

/** Favorites list. */
const Favorites = ({ disableDragAndDrop }: { disableDragAndDrop?: boolean }) => {
  const [showOptions, setShowOptions] = useState(false)

  const simplePaths = useSelector(state => {
    return (getLexeme(state, '=favorite')?.contexts || [])
      .map(id => {
        const thought = getThoughtById(state, id)
        if (!thought) return null
        const path = thoughtToPath(state, thought.parentId)
        return path
      })
      .filter(nonNull)
  }, _.isEqual)

  const hideContexts = useSelector(getUserSetting(Settings.favoritesHideContexts))

  return (
    <div className='favorites'>
      <div>
        {simplePaths.length > 0 ? (
          <div>
            <FavoritesOptions setShowOptions={setShowOptions} showOptions={showOptions} />
            <div className={css({ marginTop: '1em' })}>
              {simplePaths.map(simplePath => (
                <DragAndDropFavorite
                  key={head(simplePath)}
                  simplePath={simplePath}
                  disableDragAndDrop={disableDragAndDrop}
                  hideContext={hideContexts}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className={css({ marginTop: '1em', maxWidth: 450 })}>
            To add a thought to your favorites list, set the cursor on a thought and tap{' '}
            <FavoritesIcon cssRaw={css.raw({ verticalAlign: 'text-bottom' })} /> in the toolbar.
          </div>
        )}
        <DropEnd disableDragAndDrop={disableDragAndDrop} />
      </div>
    </div>
  )
}

export default Favorites
