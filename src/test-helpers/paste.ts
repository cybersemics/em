import { store } from '../store'
import importToContext from './importToContext'
import { HOME_TOKEN } from '../constants'

function paste(text: string): void
function paste(pathUnranked: string[], text: string): void

/** Pastes text into a context using the global store. */
function paste(pathUnranked: string | string[], text?: string): void {

  const _pathUnranked = typeof pathUnranked === 'string' ? [HOME_TOKEN] : pathUnranked as string[]
  const _text = typeof pathUnranked === 'string' ? pathUnranked : text!

  store.dispatch(importToContext(_pathUnranked, _text))
}

export default paste
