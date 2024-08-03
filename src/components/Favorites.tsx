import classNames from 'classnames'
import _ from 'lodash'
import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import CSSTransition from 'react-transition-group/CSSTransition'
import DragThoughtZone from '../@types/DragThoughtZone'
import SimplePath from '../@types/SimplePath'
import { toggleUserSettingActionCreator as toggleUserSetting } from '../actions/toggleUserSetting'
import { Settings } from '../constants'
import useDragAndDropFavorites from '../hooks/useDragDropFavorites'
import useDragHold from '../hooks/useDragHold'
import { getLexeme } from '../selectors/getLexeme'
import getThoughtById from '../selectors/getThoughtById'
import getUserSetting from '../selectors/getUserSetting'
import themeColors from '../selectors/themeColors'
import thoughtToPath from '../selectors/thoughtToPath'
import fastClick from '../util/fastClick'
import head from '../util/head'
import nonNull from '../util/nonNull'
import Checkbox from './Checkbox'
import ThoughtLink from './ThoughtLink'
import StarIcon from './icons/StarIcon'

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
  const colors = useSelector(themeColors)
  const { dragSource, dropTarget, isDragging, isHovering } = useDragAndDropFavorites({
    disableDragAndDrop,
    simplePath,
    path: simplePath,
  })
  const dragHoldResult = useDragHold({ isDragging, simplePath, sourceZone: DragThoughtZone.Favorites })

  return (
    // Set overflow:auto so the drop target fully wraps its contents.
    // Otherwise the context-breadcrumbs margin-top will leak out and create a dead zone where the favorite cannot be dropped.
    <div {...dragHoldResult.props} style={{ overflow: 'auto' }} ref={node => dragSource(dropTarget(node))}>
      {!disableDragAndDrop && isHovering && (
        <span
          className={classNames({
            'drop-hover': true,
            pressed: !disableDragAndDrop && dragHoldResult.isPressed,
          })}
          style={{
            backgroundColor: colors.highlight,
            marginLeft: 0,
            marginTop: '-0.4em',
            width: 'calc(100% - 4em)',
          }}
        />
      )}
      <ThoughtLink
        hideContext={hideContext}
        path={simplePath}
        styleLink={{
          ...(!disableDragAndDrop &&
            (isDragging || dragHoldResult.isPressed
              ? {
                  color: colors.highlight,
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
    <div style={{ height: '4em' }} ref={dropTarget}>
      <span
        className='drop-hover'
        style={{
          marginLeft: 0,
          marginTop: 0,
          width: 'calc(100% - 4em)',
          background: isHovering ? 'rgba(155, 170, 220, 1)' : undefined,
        }}
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
    <div style={{ marginBottom: '0.5em', marginLeft: 2 }}>
      {/* Show Options toggle */}
      <div style={{ marginLeft: '1em' }}>
        <span
          {...fastClick(() => setShowOptions(!showOptions))}
          style={{ color: '#444', cursor: 'pointer', fontSize: '0.7em', fontWeight: 'bold', position: 'relative' }}
        >
          <span
            style={{
              display: 'inline-block',
              transform: `rotate(${showOptions ? 90 : 0}deg)`,
              transition: 'transform 150ms ease-out',
              // avoid position:absolute to trivially achieve correct vertical alignment with text
              marginLeft: '-1em',
            }}
          >
            ▸
          </span>{' '}
          <span>OPTIONS</span>
        </span>
      </div>

      <div style={{ overflow: 'hidden' }}>
        <CSSTransition in={showOptions} nodeRef={formRef} timeout={150} classNames='slidedown' unmountOnExit>
          <form
            ref={formRef}
            className='text-small'
            style={{
              backgroundColor: '#3e3e3e',
              borderRadius: '0.5em',
              padding: '1em',
            }}
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
            <div style={{ marginTop: '1em' }}>
              {simplePaths.map((simplePath, i) => (
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
          <div style={{ marginTop: '1em', maxWidth: 450 }}>
            To add a thought to your favorites list, set the cursor on a thought and tap{' '}
            <StarIcon style={{ verticalAlign: 'text-bottom' }} /> in the toolbar.
          </div>
        )}
        <DropEnd disableDragAndDrop={disableDragAndDrop} />
      </div>
    </div>
  )
}

export default Favorites
