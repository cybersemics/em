import Command from '../@types/Command'
import organizeThoughtAction from '../actions/organizeThought'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from '../actions/setIsMulticursorExecuting'
import { showModalActionCreator as showModal } from '../actions/showModal'
import GenerateThoughtIcon from '../components/icons/GenerateThoughtIcon'
import canOrganizeThought from '../selectors/canOrganizeThought'
import selectedPaths from '../selectors/selectedPaths'
import requestAiDisclosure from '../util/aiDisclosure'
import isDocumentEditable from '../util/isDocumentEditable'

/** Restructures the selected sibling thoughts and their descendants using AI. */
const organizeThought = {
  id: 'organizeThought',
  label: 'Organize Thoughts' as const,
  description: state =>
    Object.keys(state.multicursors).length > 1
      ? 'Restructures the selected thoughts using AI: categorize, split, and reorder them.'
      : 'Restructures the current thought and its descendants using AI: categorize, split, and reorder them.',
  gesture: 'uru',
  svg: GenerateThoughtIcon,
  multicursor: {
    /** Organizes all selected sibling thoughts in one request within one undo bracket. */
    execMulticursor: (cursors, dispatch) => {
      /** Waits for the reorganization request before closing the multicursor undo bracket. */
      const organizeAll = async () => {
        await Promise.resolve()
        dispatch(setIsMulticursorExecuting({ value: true, undoLabel: 'organizeThought' }))
        try {
          await dispatch(organizeThoughtAction(cursors))
        } finally {
          dispatch(setIsMulticursorExecuting({ value: false }))
        }
      }

      /** Requests disclosure before organizing the full selection. */
      const organizeAllWithDisclosure = () => {
        if (requestAiDisclosure(organizeAllWithDisclosure)) {
          dispatch(showModal({ id: 'aiDisclosure' }))
          return
        }
        organizeAll()
      }

      organizeAllWithDisclosure()
    },
  },
  canExecute: state => isDocumentEditable() && canOrganizeThought(state, selectedPaths(state)),
  exec: async (dispatch, getState, event, commandContext) => {
    const paths = selectedPaths(getState())
    if (paths.length === 0) return

    if (requestAiDisclosure(() => organizeThought.exec(dispatch, getState, event, commandContext))) {
      dispatch(showModal({ id: 'aiDisclosure' }))
      return
    }

    dispatch(setIsMulticursorExecuting({ value: true, undoLabel: 'organizeThought' }))
    try {
      await dispatch(organizeThoughtAction(paths))
    } finally {
      dispatch(setIsMulticursorExecuting({ value: false }))
    }
  },
} satisfies Command

export default organizeThought
