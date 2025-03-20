import React, { useState } from 'react'
import PanelCommandGroup from './PanelCommandGroup'

interface PanelCommandRadioGroupProps {
  children: React.ReactNode
  defaultValue?: string
  onChange?: (value: string) => void
}

/** A component that groups PanelCommand components with radio button behavior. */
const PanelCommandRadioGroup: React.FC<PanelCommandRadioGroupProps> = ({ children, defaultValue, onChange }) => {
  const [activeRadioButton, setActiveRadioButton] = useState(defaultValue ?? '')

  /** Handles the selection of a radio button. */
  const handleRadioButtonSelect = (value: string) => {
    setActiveRadioButton(value)
    if (onChange) onChange(value)
  }

  return (
    <PanelCommandGroup>
      {React.Children.map(children, child =>
        React.cloneElement(child as React.ReactElement, {
          isSelected: activeRadioButton === (child as React.ReactElement).props.value,
          onSelect: () => handleRadioButtonSelect((child as React.ReactElement).props.value),
        }),
      )}
    </PanelCommandGroup>
  )
}

export default PanelCommandRadioGroup
