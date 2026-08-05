import { ComponentType } from 'react'
import DeleteIcon from '../icons/DeleteIcon'
import FavoritesIcon from '../icons/FavoritesIcon'
import PencilIcon from '../icons/PencilIcon'

/** Valid sidebar section IDs. */
export type SidebarSectionId = 'favorites' | 'recentlyEdited' | 'recentlyDeleted'

export type SidebarSection = {
  id: SidebarSectionId
  label: string
  icon: ComponentType<{ size?: number; fill?: string }>
  hue: number
  saturate: number
}

/**
 * All available sidebar sections, in display order.
 * The hue values are chosen to create visually distinct color tints:
 * - Favorites: 0° (no rotation, uses the base overlay color)
 * - Recently Edited: -45° (shifts toward cooler tones)
 * - Recently Deleted: 128° (shifts toward warmer tones).
 */
export const SECTIONS: SidebarSection[] = [
  { id: 'favorites', label: 'Favorites', icon: FavoritesIcon, hue: 0, saturate: 1 },
  { id: 'recentlyEdited', label: 'Recently Edited', icon: PencilIcon, hue: -45, saturate: 1.05 },
  { id: 'recentlyDeleted', label: 'Recently Deleted', icon: DeleteIcon, hue: 128, saturate: 1.1 },
]
