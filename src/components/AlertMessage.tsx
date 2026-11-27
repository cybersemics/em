import { FC } from 'react'
import { css } from '../../styled-system/css'
import type { AlertPart } from '../@types/Alert'
import toVisibleText from '../util/toVisibleText'

/**
 * Renders an alert message built with `alertMessage` on a single line. When the line is wider than the screen, only the
 * thought pieces shrink with an ellipsis, so the surrounding text stays readable.
 */
const AlertMessage: FC<{ parts: AlertPart[] }> = ({ parts }) => (
  <span
    // Notification lifts its 30em cap on alert content that contains this line, so the line can use the full screen width.
    data-alert-line
    className={css({
      display: 'flex',
      // Allow the line to shrink below its content width, so the thought pieces inside it can shrink.
      minWidth: 0,
      // Flex items trim the spaces at their edges. `pre` keeps the spaces between the pieces.
      whiteSpace: 'pre',
    })}
  >
    {parts.map((part, i) =>
      typeof part === 'string' ? (
        <span key={i} className={css({ flexShrink: 0 })}>
          {part}
        </span>
      ) : (
        <span
          key={i}
          className={css({
            flexShrink: 1,
            minWidth: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          })}
        >
          {toVisibleText(part.thought)}
        </span>
      ),
    )}
  </span>
)

export default AlertMessage
