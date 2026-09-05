import Command from '../@types/Command'
import generateEmojiAtPath from '../actions/generateEmoji'
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
    /** Generates or cycles emoji for every selected thought within one undo bracket. */
    execMulticursor: (cursors, dispatch, _getState, commandContext) => {
      /** Waits for all inference requests before closing the multicursor undo bracket. */
      const generateAll = async () => {
        // The command framework's synchronous bracket closes before inference resolves, so open an async bracket after
        // yielding and keep it open until every selected thought has settled.
        await Promise.resolve()
        dispatch(setIsMulticursorExecuting({ value: true, undoLabel: 'generateEmoji' }))
        await Promise.allSettled(
          cursors.map(path => dispatch(generateEmojiAtPath(path, commandContext.withCommandMetadata))),
        )
        dispatch(setIsMulticursorExecuting({ value: false }))
      }

      /** Requests disclosure before generating emoji for the full selection. */
      const generateAllWithDisclosure = () => {
        if (requestAiDisclosure(generateAllWithDisclosure)) {
          dispatch(showModal({ id: 'aiDisclosure' }))
          return
        }
        return generateAll()
      }

      return generateAllWithDisclosure()
    },
  },
  canExecute: state => isDocumentEditable() && (!!state.cursor || hasMulticursor(state)),
  exec: async (dispatch, getState, event, commandContext) => {
    const cursor = getState().cursor
    if (!cursor) return

    if (requestAiDisclosure(() => generateEmoji.exec(dispatch, getState, event, commandContext))) {
      dispatch(showModal({ id: 'aiDisclosure' }))
      return
    }

    await dispatch(generateEmojiAtPath(cursor, commandContext.withCommandMetadata ?? (operation => operation())))
  },
} satisfies Command

export default generateEmoji
