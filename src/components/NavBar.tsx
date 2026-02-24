import { useRef } from 'react'
import { shallowEqual, useSelector } from 'react-redux'
import { css } from '../../styled-system/css'
import Path from '../@types/Path'
import { isTouch } from '../browser'
import { BASE_FONT_SIZE } from '../constants'
import isTutorial from '../selectors/isTutorial'
import distractionFreeTypingStore from '../stores/distractionFreeTyping'
import isDocumentEditable from '../util/isDocumentEditable'
import publishMode from '../util/publishMode'
import ContextBreadcrumbs from './ContextBreadcrumbs'
import FadeTransition from './FadeTransition'
import HomeLink from './HomeLink'
import InvitesButton from './InvitesButton'
import Scale from './Scale'

/** Renders ContextBreadcrumbs for the cursor. */
const CursorBreadcrumbs = ({ position }: { position: string }) => {
  const breadcrumbSimplePath = useSelector(
    state => (state.cursor ? state.cursor.slice(publishMode() ? 1 : 0, state.cursor.length) : []) as Path,
    shallowEqual,
  )

  return (
    <div
      className={css({ marginLeft: '3.7px', marginTop: '7.462px', width: 'calc(100% - 40px)', paddingLeft: '35px' })}
    >
      <ContextBreadcrumbs
        variant='small'
        color='breadcrumbs'
        linkCssRaw={css.raw({
          '&:hover': {
            color: 'fg',
          },
        })}
        path={breadcrumbSimplePath}
      />
    </div>
  )
}

/** A navigation bar that contains a link to home and breadcrumbs. */
const NavBar = ({ position }: { position: string }) => {
  const isTutorialOn = useSelector(isTutorial)
  const authenticated = useSelector(state => state.authenticated)
  const editing = useSelector(state => state.isKeyboardOpen)
  const distractionFreeTyping = distractionFreeTypingStore.useState()
  const fontSize = useSelector(state => state.fontSize)
  const scale = fontSize / BASE_FONT_SIZE

  const showHomeLink = useSelector(state => isDocumentEditable() || (!!state.cursor && state.cursor.length > 2))
  const isCursor = useSelector(state => !!state.cursor && state.cursor.length > 0)

  const cursorBreadcrumbsWrapperRef = useRef<HTMLDivElement>(null)

  return (
    <div
      className={css({
        zIndex: 'navbar',
        ...(!isTouch || !editing
          ? {
              position: 'sticky',
              /* spacing.safeAreaBottom applies for rounded screens */
              bottom: 'calc(max(11px, token(spacing.safeAreaBottom)))',
              marginBottom: '10px',
            }
          : undefined),
      })}
    >
      {/* {isTouch && <SidebarGutter />} */}
      <Scale amount={scale} origin='bottom left'>
        <div
          aria-label='nav'
          className={css({
            position: 'sticky',
            zIndex: 'stack',
            padding: '0 15px 0 10px',
            bottom: '0',
            backgroundColor: isCursor ? 'bg' : undefined,
            boxShadow: isCursor ? `0 20px 15px 25px {colors.bg}` : undefined,
            ...(position === 'top' ? { top: 0 } : position === 'bottom' ? { padding: '0 15px' } : {}),
          })}
        >
          <div>
            <div
              className={css({
                position: 'absolute',
                /* offset .nav padding */
                width: 'calc(100% - 30px)',
                transition: 'background-color {durations.fast} ease-out',
                justifyContent: 'flex-end',
                ...(position === 'bottom' && {
                  position: 'relative',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'flex-end',
                }),
              })}
            >
              {!isTutorialOn && (
                <>
                  {/* The entire bottom nav is scaled by font size using the Scale component, so we can use a fixed size here. */}
                  {showHomeLink ? (
                    <HomeLink
                      size={24}
                      className={css({
                        position: 'relative',
                        zIndex: 'stack',
                        ...(position === 'top' && { cssFloat: 'left', marginRight: '2px' }),
                        ...(position === 'bottom' && { position: 'absolute', left: '-2px' }),
                      })}
                    />
                  ) : null}
                  <FadeTransition
                    type='fast'
                    nodeRef={cursorBreadcrumbsWrapperRef}
                    in={!distractionFreeTyping}
                    unmountOnExit
                  >
                    <div ref={cursorBreadcrumbsWrapperRef} className={css({ flexGrow: 1 })}>
                      <CursorBreadcrumbs position={position} />
                    </div>
                  </FadeTransition>

                  <div
                    className={css({
                      display: 'grid',
                      gridAutoFlow: 'column',
                      gridColumnGap: '15px',
                      alignItems: 'center',
                    })}
                  >
                    <>
                      {authenticated && <InvitesButton />}
                      {/* <FeedbackButton /> */}
                      {/* <QuickAddButton /> */}
                    </>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Scale>
    </div>
  )
}

export default NavBar
