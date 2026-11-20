import { FC, PropsWithChildren } from 'react'
import { useSelector } from 'react-redux'
import { css } from '../../styled-system/css'

/** A border around special keys. */
const Kbd: FC<PropsWithChildren<{ isText?: boolean; size?: number }>> = ({ children, isText, size }) => {
  const fontSize = useSelector(state => state.fontSize)
  const keySize = size ?? fontSize * 1.1

  return (
    <kbd
      className={css({
        boxSizing: 'border-box',
        height: '1.1em',
        width: '1.1em',
        border: '1px solid {colors.fgOverlay30}',
        fontSize: isText ? '0.65em' : '0.7em',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 3,
      })}
      style={{ width: keySize, height: keySize }}
    >
      {children}
    </kbd>
  )
}

export default Kbd
