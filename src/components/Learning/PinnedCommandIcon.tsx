import { useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../../styled-system/css'
import { token } from '../../../styled-system/tokens'
import Command from '../../@types/Command'
import SettingsIcon from '../icons/SettingsIcon'

/** The pinned command's icon inside the ring. It plays the command's icon animation each time a rep lands, as the toolbar does when the command is activated. */
const PinnedCommandIcon = ({ command, repCount }: { command: Command; repCount: number }) => {
  // Like the toolbar, a toggle command that has just been switched off does not animate.
  const isCommandActive = useSelector(state => !command.isActive || command.isActive(state))
  const [isAnimated, setIsAnimated] = useState(false)
  // The rep count already animated, so the count on mount plays nothing.
  const animatedRepCount = useRef(repCount)

  useEffect(() => {
    if (repCount === animatedRepCount.current) return
    animatedRepCount.current = repCount
    setIsAnimated(isCommandActive)
  }, [repCount, isCommandActive])

  const Icon = command.svg ?? SettingsIcon
  return (
    <Icon
      // Remounting on each rep restarts the animation when a rep lands while the previous one is still playing.
      key={repCount}
      size={14}
      fill={token('colors.gray50')}
      className={css({ flex: 'none' })}
      animated={isAnimated}
      animationComplete={() => setIsAnimated(false)}
    />
  )
}

export default PinnedCommandIcon
