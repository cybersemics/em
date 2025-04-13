import { css } from '../../styled-system/css'
import CommandSortType from '../@types/CommandSortType'

interface SortOptionProps {
  sort: CommandSortType
  label: string
  selectedSort: CommandSortType
  handleSortChange: (sortOrder: CommandSortType) => void
}

/** Displays sort options for SortButton, which is used to sort commands in the CommandTable. */
const SortOption = ({ sort, label, selectedSort, handleSortChange }: SortOptionProps) => {
  return (
    <label
      className={css({
        display: 'flex',
        flexDirection: 'row',
      })}
    >
      <input
        type='radio'
        checked={selectedSort === sort}
        onChange={() => handleSortChange(sort)}
        className={css({
          appearance: 'none',
          width: '12px',
          height: '12px',
          border: '2px solid {colors.gray50}',
          borderRadius: '50%',
          display: 'inline-block',
          position: 'relative',
          '&:checked': {
            borderColor: 'fg',
          },
        })}
      />
      <h3
        className={css({
          color: selectedSort === sort ? 'fg' : 'gray50',
          margin: '0 0 0 0.2rem',
          fontWeight: 'normal',
          fontSize: '0.9rem',
        })}
      >
        {label}
      </h3>
    </label>
  )
}

export default SortOption
