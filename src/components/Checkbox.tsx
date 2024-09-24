import React, { FC, PropsWithChildren } from 'react'
import { css } from '../../styled-system/css'
import fastClick from '../util/fastClick'

/** A static checkbox component with em styling. */
const CheckboxInput = ({ checked }: { checked?: boolean }) => {
  return (
    <>
      {/* Ignore onChange and just use parent onClick, otherwise it triggers twice on desktop. It may be possible if the second onChange is prevented. readOnly is only set to avoid a React warning.
          Note: never preventDefault on a controlled checkbox onChange in React.
          See: https://stackoverflow.com/a/70030088/4806080 */}
      <input
        type='checkbox'
        checked={checked}
        readOnly
        className={css({ position: 'absolute', opacity: 0, cursor: 'pointer', height: '0', width: '0' })}
      />
      <span
        className={css({
          position: 'absolute',
          top: '0.1em',
          left: '0.1em',
          height: '1em',
          width: '1em',
          backgroundColor: 'transparent',
          border: '0.1em solid {colors.fg}',
          '&::after': {
            /* Create the checkbox/indicator (hidden when not checked) */
            content: "''",
            position: 'absolute',
            left: '0.3em',
            bottom: '0.2em',
            width: '0.3em',
            height: '0.65em',
            border: 'solid {colors.fg}',
            borderWidth: '0 0.15em 0.15em 0',
            transform: 'rotate(45deg)',
            /* Show the checkbox when checked */
            display: checked ? 'block' : 'none',
          },
          // extend tap area without disrupting padding
          margin: 10,
          transform: 'translate(-10px, -10px)',
        })}
      />
    </>
  )
}

/** A checkbox item with a title and description. */
const Checkbox: FC<
  PropsWithChildren<{
    checked?: boolean
    disabled?: boolean
    child?: boolean
    parent?: boolean
    onChange: (e: React.MouseEvent | React.TouchEvent | React.ChangeEvent) => void
    title?: string
  }>
> = ({ checked, children, disabled, child, onChange, parent, title }) => {
  return (
    <label
      className={css({
        display: 'block',
        position: 'relative',
        paddingLeft: '2.2em',
        userSelect: 'none',
        opacity: disabled ? 0.5 : undefined,
        marginBottom: children ? (parent ? '0.5em' : '1em') : 0,
        // child marginLeft should match .checkbox-container padding-left
        marginLeft: child ? '2.2em' : undefined,
        pointerEvents: disabled ? 'none' : undefined,
        cursor: disabled ? 'default' : 'pointer',
      })}
      // prevent the default click behavior, which autoscrolls in chrome if there is a checkbox within the label
      {...fastClick(e => {
        e.preventDefault()
        onChange(e)
      })}
    >
      <div
        className={css({
          // Ensure that the title and description margins are not merged with checkbox-container margins.
          // For some reason they were preserved in Exports Advanced Settings but not User Settings.
          overflow: 'auto',
        })}
      >
        {title && <div className={css({ lineHeight: children ? 1.2 : 1.5 })}>{title}</div>}
        {children && <p className={css({ marginTop: '0.5em', fontSize: 'md', color: 'dim' })}>{children}</p>}
      </div>

      <CheckboxInput checked={checked} />
    </label>
  )
}

export default Checkbox
