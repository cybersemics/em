import { FC } from 'react'
import { css } from '../../styled-system/css'

/** Renders text with matching characters highlighted. */
const HighlightedText: FC<{ value: string; match: string; disabled?: boolean }> = ({ value, match, disabled }) => {
  // move an index forward as matches are found so that chars are only matched once each
  let index = 0

  return (
    <span>
      {value.split('').map((char, i) => {
        const matchIndex = match.trim().slice(index).toLowerCase().indexOf(char.toLowerCase()) + index
        const isMatch = matchIndex >= index

        if (isMatch) {
          index++
        }

        return (
          <span key={i}>
            <span className={css({ color: !disabled && isMatch ? 'vividHighlight' : undefined })}>{char}</span>
          </span>
        )
      })}
    </span>
  )
}

export default HighlightedText
