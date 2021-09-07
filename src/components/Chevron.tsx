import React, { CSSProperties } from 'react'

import { Icon } from 'react-icons-kit'
import { chevronDown } from 'react-icons-kit/feather/chevronDown'
import styled from 'styled-components'
import tw from 'twin.macro'

interface ChevronProps {
  onClickHandle: () => void
  className?: string
  additonalStyle?: CSSProperties
}

/**
 * Chevron Icon.
 */
const ChevronIcon = ({ onClickHandle, className }: ChevronProps) => (
  <Icon icon={chevronDown} className={className} onClick={onClickHandle} size={22} />
)

/** Chevron icon that animates when orientation is changed. */
const Chevron = styled(ChevronIcon)<{ orientation: 'up' | 'down' }>`
  ${tw`
    transition-transform
    dark:text-white
    light:text-black
    cursor-pointer
  `}
  transform: rotate(${props => (props.orientation === 'up' ? '180deg' : '0deg')});
`

export default Chevron
