import React, { useRef, useEffect } from 'react'
import { useDispatch } from 'react-redux'
import * as pkg from '../../package.json'
import { TUTORIAL2_STEP_SUCCESS } from '../constants'
import { alert, logout, showModal } from '../action-creators'
import { scaleFontDown, scaleFontUp } from '../action-creators/scaleSize'
import { useFooterUseSelectors } from '../hooks/Footer.useSelectors'
import scrollTo from '../device/scrollTo'
import tw, { styled } from 'twin.macro'
import TextLink from './TextLink'

/** A footer component with some useful links. */
const Footer = () => {
  const dispatch = useDispatch()
  const { authenticated, user, status, tutorialStep, isPushing, isTutorialOn, isPushQueueEmpty, fontSize } =
    useFooterUseSelectors()

  const firstUpdate = useRef(true)

  // alert when font size changes
  useEffect(() => {
    // prevent alert dispatch when rendered for first time
    if (!firstUpdate.current) {
      dispatch(alert(`Font size: ${fontSize}`, { clearDelay: 2000 }))
      scrollTo('bottom')
    } else {
      firstUpdate.current = false
    }
  }, [fontSize])

  // hide footer during tutorial
  // except for the last step that directs them to the Help link in the footer

  if (isTutorialOn && tutorialStep !== TUTORIAL2_STEP_SUCCESS) return null

  return (
    <FooterWrapper>
      <UnorderedList>
        <li>
          <FontChangeWrapper>
            <FontIncreaseItem colorVariant='blue' underline onClick={() => dispatch(scaleFontUp())}>
              A
            </FontIncreaseItem>
            <FontDecreaseItem colorVariant='blue' underline onClick={() => dispatch(scaleFontDown())}>
              A
            </FontDecreaseItem>
          </FontChangeWrapper>
        </li>
        <li>
          <Footerlink
            colorVariant='blue'
            underline
            tabIndex={-1}
            onClick={() => dispatch(showModal({ id: 'feedback' }))}
            target='_blank'
            rel='noopener noreferrer'
          >
            Feedback
          </Footerlink>
          <Divider> | </Divider>
          <Footerlink colorVariant='blue' underline tabIndex={-1} onClick={() => dispatch(showModal({ id: 'help' }))}>
            Help
          </Footerlink>
          {window.firebase ? (
            <span>
              <Divider> | </Divider>
              {authenticated ? (
                <Footerlink colorVariant='blue' underline tabIndex={-1} onClick={() => dispatch(logout())}>
                  Log Out
                </Footerlink>
              ) : (
                <Footerlink
                  colorVariant='blue'
                  underline
                  tabIndex={-1}
                  onClick={() => dispatch(showModal({ id: 'auth' }))}
                >
                  Log In
                </Footerlink>
              )}
            </span>
          ) : null}
        </li>
      </UnorderedList>
      <br />

      {user && (
        <>
          <InfoWrapper>
            <InfoLabel>Status: </InfoLabel>
            <StatusDescriptionText
              status={
                status === 'offline'
                  ? 'offline'
                  : !isPushQueueEmpty && !isPushing
                  ? 'error'
                  : status === 'loaded'
                  ? 'online'
                  : 'offline'
              }
            >
              {
                // pushQueue will be empty after all updates have been flushed to Firebase.
                // isPushing is set back to true only when all updates have been committed.
                // This survives disconnections as long as the app isn't restarted and the push Promise does not time out. In that case, Firebase will still finish pushing once it is back online, but isPushing will be false. There is no way to independently check the completion status of Firebase offline writes (See: https://stackoverflow.com/questions/48565115/how-to-know-my-all-local-writeoffline-write-synced-to-firebase-real-time-datab#comment84128318_48565275).
                (!isPushQueueEmpty || isPushing) && (status === 'loading' || status === 'loaded')
                  ? 'Saving'
                  : status === 'loaded'
                  ? 'Online'
                  : status[0].toUpperCase() + status.substring(1)
              }
            </StatusDescriptionText>
          </InfoWrapper>
          <InfoWrapper>
            <InfoLabel>Logged in as: </InfoLabel>
            {user.email}
          </InfoWrapper>
          <InfoWrapper>
            <InfoLabel>User ID: </InfoLabel>
            <MonoInfoDescription>{user.uid.slice(0, 6)}</MonoInfoDescription>
          </InfoWrapper>
        </>
      )}

      <InfoWrapper>
        <InfoLabel>Version: </InfoLabel>
        <span>{pkg.version}</span>
      </InfoWrapper>
    </FooterWrapper>
  )
}

const FooterWrapper = tw.footer`
  p-5
  m-0
  bg-gray-200
  dark:bg-gray-900
`

const UnorderedList = tw.li`
  text-right
  text-sm
  list-none
  w-full

  flex
  items-end
  justify-between
`

const FontChangeWrapper = tw.div`
  text-2xl
`

const FontIncreaseItem = tw(TextLink)`
  font-size[1em]
  p-2.5
`

const FontDecreaseItem = tw(TextLink)`
  font-size[0.7em]
  p-2.5
  -ml-1.5
`

const Footerlink = tw(TextLink)`
  text-sm
`

const InfoWrapper = tw.div`
  text-right
  text-sm
  m-1
`

const InfoLabel = tw.span`
  text-gray-400
`

const MonoInfoDescription = tw.span`
  font-family[monospace]
`

const statusDescriptionVaraint = {
  offline: tw`text-gray-500 text-opacity-70`,
  online: tw`text-green-400`,
  error: tw`text-red-400`,
}

const StatusDescriptionText = styled.span<{ status: 'offline' | 'online' | 'error' }>`
  ${props => statusDescriptionVaraint[props.status]}
`

const Divider = tw.span`
  mx-1.5
`

export default Footer
