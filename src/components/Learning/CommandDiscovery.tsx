import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import { commandDiscoveryActionCreator as commandDiscovery } from '../../actions/commandDiscovery'
import { commandById, gestureString } from '../../commands'
import commandDiscoveryStore from '../../stores/commandDiscoveryStore'
import GestureDiagram from '../GestureDiagram'

/** How long the light takes to glide from the Gesture Menu to the center of the screen, in seconds. */
const GLIDE = 0.75
/** When the command's name arrives, after the light has all but settled, in seconds from the start. */
const NAME_AT = 0.6
/** When its description follows, once there is nothing else moving to compete with reading it. */
const DESCRIPTION_AT = 0.95
/** When the note and Done follow. */
const REST_AT = 1.2
/** The glide's easing: away gently, quickly through the middle, and gently to rest. */
const GLIDE_EASE = [0.6, 0, 0.2, 1] as const

/** The screen for one command. Split from CommandDiscovery so that it mounts, and plays, once for each discovery. */
const Discovery = ({ command }: { command: Command }) => {
  const dispatch = useDispatch()
  const description = useSelector(state =>
    typeof command.description === 'function' ? command.description(state) : command.description,
  )
  const close = useCallback(() => dispatch(commandDiscovery({ commandId: null })), [dispatch])

  // Where the light starts: where the command sat in the Gesture Menu, which is where the user is already looking.
  // Measured against where its name comes to rest, so the light and the fog it carries glide exactly between the two.
  const nameRef = useRef<HTMLDivElement>(null)
  const [from, setFrom] = useState<{ x: number; y: number } | null>(null)
  useLayoutEffect(() => {
    const origin = commandDiscoveryStore.getState().origin
    const rect = nameRef.current?.getBoundingClientRect()
    setFrom(origin && rect ? { x: origin.x - rect.left, y: origin.y - (rect.top + rect.height / 2) } : { x: 0, y: 0 })
  }, [])

  // Done and Escape finish.
  useEffect(() => {
    /** Closes on Escape. */
    const onKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [close])

  /** Fades a part of the screen in at its moment in the sequence. */
  const arrive = (at: number) => ({
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: at, duration: 0.45, ease: 'easeOut' as const },
  })

  return (
    <motion.div
      role='dialog'
      aria-label={`Discovered ${command.label}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={css({
        position: 'fixed',
        inset: 0,
        zIndex: 'commandDiscovery',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        // Dims the app and takes its place, so the command is the only thing to look at.
        background: 'commandDiscoveryBackdrop',
        fontFamily: 'radioCanada',
        userSelect: 'none',
        WebkitTouchCallout: 'none',
        overflow: 'hidden',
      })}
    >
      {/* The row the command comes to rest in. The light and the fog are placed against it, so they stay with it at
      any screen size. */}
      <div className={css({ position: 'relative', paddingLeft: '30px', paddingRight: '37px' })}>
        {from && (
          <>
            {/* The light: the brightest thing on screen, which leads the eye from the top to the center. */}
            <motion.div
              aria-hidden
              initial={{ y: from.y, opacity: 0.9, scale: 0.7 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ duration: GLIDE, ease: GLIDE_EASE }}
              className={css({
                position: 'absolute',
                left: '-40%',
                right: '-40%',
                top: '-110px',
                height: '246px',
                pointerEvents: 'none',

                background:
                  'radial-gradient(ellipse 34% 30% at 42% 50%, {colors.commandDiscoveryLightCore}, {colors.bgTransparent} 100%), radial-gradient(ellipse 50% 50% at 50% 50%, {colors.commandDiscoveryLight}, {colors.bgTransparent} 100%)',
                filter: 'blur(24px)',
              })}
            />
            {/* The fog the command was in the Gesture Menu, carried along by the light and gone by the time it lands,
            where the name takes its place. */}
            <motion.div
              aria-hidden
              initial={{ x: from.x, y: from.y, opacity: 1 }}
              animate={{ x: 0, y: 0, opacity: 0 }}
              transition={{
                duration: GLIDE,
                ease: GLIDE_EASE,
                opacity: { duration: GLIDE * 0.8, ease: 'easeIn' },
              }}
              className={css({
                position: 'absolute',
                left: '69px',
                top: 0,
                fontSize: '18px',
                lineHeight: '26px',
                fontWeight: 400,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',

                backgroundImage:
                  'linear-gradient(90deg, {colors.ghostExcitedStart} 0%, {colors.ghostExcitedEnd} 60%, {colors.ghostFogEnd} 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'blur(5px)',
              })}
            >
              {command.label}
            </motion.div>
          </>
        )}

        {/* The command: its gesture and its name. */}
        <motion.div
          {...arrive(NAME_AT)}
          className={css({ position: 'relative', display: 'flex', alignItems: 'center', gap: '19px' })}
        >
          <div
            className={css({
              flex: 'none',
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <GestureDiagram
              path={gestureString(command)}
              maxWidth={20}
              maxHeight={20}
              strokeWidth={2.75}
              arrowhead='none'
              rounded={command.rounded}
              color={token('colors.fg')}
              glow={false}
              useGradient={false}
            />
          </div>
          <div
            ref={nameRef}
            className={css({ fontSize: '18px', lineHeight: '26px', fontWeight: 700, color: 'white', opacity: 0.78 })}
          >
            {command.label}
          </div>
        </motion.div>

        <div className={css({ position: 'relative', paddingLeft: '38px' })}>
          <motion.p
            {...arrive(DESCRIPTION_AT)}
            className={css({
              margin: '7px 0 0',
              maxWidth: '279px',
              fontStyle: 'italic',
              fontSize: '15px',
              lineHeight: '25px',
              color: 'commandDiscoveryDescription',
              textShadow: '0 1px 7px {colors.commandDiscoveryDescriptionGlow}',
            })}
            // The design's 0.83, which the arrival's own opacity animation would otherwise overwrite.
            style={{ filter: 'opacity(0.83)' }}
          >
            {description}
          </motion.p>
          <motion.div {...arrive(REST_AT)}>
            <p
              className={css({
                margin: '11px 0 0',
                maxWidth: '245px',
                fontSize: '14px',
                lineHeight: '21px',

                color: 'white/60',
              })}
            >
              This gesture will show up in the Gesture Menu from now on.
            </p>
            <button
              type='button'
              onClick={close}
              className={css({
                marginTop: '14px',
                marginLeft: '-11px',
                minWidth: '80px',
                height: '35px',
                paddingInline: '22px',
                borderRadius: '999px',
                border: '1px solid {colors.fgOverlay10}',
                background: 'fgOverlay10',
                backdropFilter: 'blur(10px)',
                fontFamily: 'radioCanada',
                fontSize: '15px',
                lineHeight: '25px',
                letterSpacing: '-0.01em',

                color: 'white/65',
                cursor: 'pointer',
              })}
            >
              Done
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Command Discovery: the screen that introduces a command the user has just revealed in the Gesture Menu, by releasing
 * on its ghost. It clears everything else away and leaves one focal point. The light starts where the command sat in
 * the menu and glides to the center while the menu fades; only once it has arrived do the command's name, then its
 * description, then the note and Done come in, so the user is never reading while things move. See "Command
 * Discovery" in docs/learning.md.
 */
const CommandDiscovery = () => {
  const commandId = useSelector(state => state.commandDiscovery)
  const command = commandId ? commandById(commandId) : undefined
  return <AnimatePresence>{command && <Discovery key={command.id} command={command} />}</AnimatePresence>
}

export default CommandDiscovery
