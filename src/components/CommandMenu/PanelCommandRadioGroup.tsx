import React, { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import PanelCommandGroup from './PanelCommandGroup'
import { setActiveRadioButtonActionCreator } from '../../actions/setActiveRadioButton'
import State from '../../@types/State'

interface PanelCommandRadioGroupProps {
  children: React.ReactNode
  defaultValue?: string
  onChange?: (value: string) => void
}

/** A component that groups PanelCommand components with radio button behavior. */
const PanelCommandRadioGroup: React.FC<PanelCommandRadioGroupProps> = ({ children, defaultValue, onChange }) => {
  const dispatch = useDispatch();
  const globalActiveRadioButton = useSelector(state => state.activeRadioButton);
  const [localActiveRadioButton, setLocalActiveRadioButton] = useState(defaultValue ?? '');
  
  // Use either the local state or global state
  const activeRadioButton = globalActiveRadioButton || localActiveRadioButton;
  
  // Set initial value on mount
  useEffect(() => {
    // If defaultValue is provided, use it as the initial value
    if (defaultValue) {
      setLocalActiveRadioButton(defaultValue);
      dispatch(setActiveRadioButtonActionCreator(defaultValue));
    } 
    // If no defaultValue but we have children, use the first command's ID
    else {
      const firstChild = React.Children.toArray(children)[0] as React.ReactElement;
      if (firstChild?.props?.command?.id) {
        const firstCommandId = firstChild.props.command.id;
        setLocalActiveRadioButton(firstCommandId);
        dispatch(setActiveRadioButtonActionCreator(firstCommandId));
      }
    }
  }, []);  // Only run on mount

  /** Handles the selection of a radio button. */
  const handleRadioButtonSelect = (value: string) => {
    setLocalActiveRadioButton(value);
    dispatch(setActiveRadioButtonActionCreator(value));
    if (onChange) onChange(value);
  }

  return (
    <PanelCommandGroup>
      {React.Children.map(children, child => {
        const childElement = child as React.ReactElement;
        const commandId = childElement.props.command?.id;
        
        if (!commandId) {
          console.error('PanelCommand inside PanelCommandRadioGroup is missing a command or command id');
          return child;
        }
        
        console.log({
          commandId,
          activeRadioButton,
          isActive: activeRadioButton === commandId,
          globalActiveRadioButton,
          localActiveRadioButton
        });
        
        return React.cloneElement(childElement, {
          onSelect: () => handleRadioButtonSelect(commandId),
          isSelected: activeRadioButton === commandId,
          command: {
            ...childElement.props.command,
            isActive: (state: State) => activeRadioButton === commandId,
          },
        });
      })}
    </PanelCommandGroup>
  )
}

export default PanelCommandRadioGroup
