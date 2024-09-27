import { useSelector } from "react-redux";
import themeColors from "../selectors/themeColors";
import { FC } from "react";

/** Renders text with matching characters highlighted. */
export const HighlightedText: FC<{ value: string; match: string; disabled?: boolean }> = ({ value, match, disabled }) => {
  const colors = useSelector(themeColors)

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
            <span
              style={{
                color: !disabled && isMatch ? colors.vividHighlight : undefined,
              }}
            >
              {char}
            </span>
          </span>
        )
      })}
    </span>
  )
}