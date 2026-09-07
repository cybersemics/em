import type { Key as KeyName } from 'ts-key-enum'

interface Key {
  /** Mac: Option, Windows: Alt. */
  alt?: boolean
  /** Mac: Control, Windows: Shift (Ctrl is already the meta modifier on Windows). */
  control?: boolean
  /**
   * The value of `KeyboardEvent.key`, e.g. 'Backspace' or 'a'. Non-printable keys are autocompleted from ts-key-enum, which is a `const enum` with no runtime representation and thus can only be referenced as a template literal type.
   */
  key: `${KeyName}` | (string & {})
  /** Mac: Command, Windows: Control. */
  meta?: boolean
  shift?: boolean
}

export default Key
