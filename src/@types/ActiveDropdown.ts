import DropdownType from './DropdownType'

/** The one open mutually exclusive dropdown. Surface is temporary routing while the Toolbar migrates to the formatting-bar presentation. */
interface ActiveDropdown {
  picker: Exclude<DropdownType, 'commandCenter'>
  surface: 'toolbar' | 'formattingBar'
}

export default ActiveDropdown
