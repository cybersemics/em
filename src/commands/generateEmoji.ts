import Command from '../@types/Command'
import generateEmojiAtPaths from '../actions/generateEmoji'
import { setIsMulticursorExecutingActionCreator as setIsMulticursorExecuting } from '../actions/setIsMulticursorExecuting'
import { showModalActionCreator as showModal } from '../actions/showModal'
import GenerateThoughtIcon from '../components/icons/GenerateThoughtIcon'
import hasMulticursor from '../selectors/hasMulticursor'
import requestAiDisclosure from '../util/aiDisclosure'
import isDocumentEditable from '../util/isDocumentEditable'

/** Generates and cycles emoji for the current thought using AI. */
const generateEmoji = {
  id: 'generateEmoji',
  label: 'Generate Emoji' as const,
  description: 'Generates and cycles emoji that represent a thought.',
  gesture: 'urd',
  svg: GenerateThoughtIcon,
  multicursor: {
    /** Generates or cycles emoji for every selected thought in one request within one undo bracket. */
    execMulticursor: (cursors, dispatch) => {
      /** Waits for the inference request before closing the multicursor undo bracket. */
      const generateAll = async () => {
        // The command framework's synchronous bracket closes before inference resolves, so open an async bracket after
        // yielding and keep it open until every selected thought has settled.
        await Promise.resolve()
        dispatch(setIsMulticursorExecuting({ value: true, undoLabel: 'generateEmoji' }))
        try {
          await dispatch(generateEmojiAtPaths(cursors))
        } finally {
          dispatch(setIsMulticursorExecuting({ value: false }))
        }
      }

      /** Requests disclosure before generating emoji for the full selection. */
      const generateAllWithDisclosure = (): Promise<void | false> => {
        const pending = requestAiDisclosure(generateAllWithDisclosure)
        if (pending) {
          dispatch(showModal({ id: 'aiDisclosure' }))
          return pending
        }
        return generateAll()
      }

      return generateAllWithDisclosure()
    },
  },
  canExecute: state => isDocumentEditable() && (!!state.cursor || hasMulticursor(state)),
  exec: async (dispatch, getState, event, commandContext): Promise<void | false> => {
    const cursor = getState().cursor
    if (!cursor) return false

    const pending = requestAiDisclosure(() => generateEmoji.exec(dispatch, getState, event, commandContext))
    if (pending) {
      dispatch(showModal({ id: 'aiDisclosure' }))
      return pending
    }

    await dispatch(generateEmojiAtPaths([cursor]))
  },
} satisfies Command

export default generateEmoji
