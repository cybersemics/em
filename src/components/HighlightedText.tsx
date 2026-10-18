import { FC } from 'react'
import { css } from '../../styled-system/css'
import fuzzyWordMatch from '../util/fuzzyWordMatch'

/** Renders text with the characters that matched the search highlighted, using the same matching as the command search so that the highlight shows why a command matched. */
const HighlightedText: FC<{ value: string; match: string; disabled?: boolean }> = ({ value, match, disabled }) => {
  const matched = new Set(fuzzyWordMatch(value, match) ?? [])

  return (
    <span>
      {value.split('').map((char, i) => (
        <span key={i}>
          <span
            className={css({
              color: match.trim()
                ? !disabled && matched.has(i)
                  ? 'highlightedTextMatch'
                  : 'highlightedTextUnmatched'
                : undefined,
            })}
          >
            {char}
          </span>
        </span>
      ))}
    </span>
  )
}

export default HighlightedText
