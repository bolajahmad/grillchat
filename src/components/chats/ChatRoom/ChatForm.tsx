import Send from '@/assets/icons/send.svg'
import { buttonStyles } from '@/components/Button'
import CaptchaInvisible from '@/components/captcha/CaptchaInvisible'
import TextArea from '@/components/inputs/TextArea'
import { ESTIMATED_ENERGY_FOR_ONE_TX } from '@/constants/chat'
import useRequestTokenAndSendMessage from '@/hooks/useRequestTokenAndSendMessage'
import useToastError from '@/hooks/useToastError'
import { ApiRequestTokenResponse } from '@/pages/api/request-token'
import { getPostQuery } from '@/services/api/query'
import { useSendMessage } from '@/services/subsocial/commentIds'
import { useSendEvent } from '@/stores/analytics'
import { useMyAccount } from '@/stores/my-account'
import { cx } from '@/utils/class-names'
import { isTouchDevice } from '@/utils/device'
import {
  ComponentProps,
  SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from 'react'

export type ChatFormProps = Omit<ComponentProps<'form'>, 'onSubmit'> & {
  postId: string
  onSubmit?: () => void
  replyTo?: string
  clearReplyTo?: () => void
}

function processMessage(message: string) {
  return message.trim()
}

export default function ChatForm({
  className,
  postId,
  onSubmit,
  replyTo,
  clearReplyTo,
  ...props
}: ChatFormProps) {
  const { data: post } = getPostQuery.useQuery(postId)
  const topicName = post?.content?.title ?? ''

  const sendEvent = useSendEvent()

  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const isLoggedIn = useMyAccount((state) => !!state.address)
  const hasEnoughEnergy = useMyAccount(
    (state) => (state.energy ?? 0) > ESTIMATED_ENERGY_FOR_ONE_TX
  )
  const [isRequestingEnergy, setIsRequestingEnergy] = useState(false)

  const {
    mutateAsync: requestTokenAndSendMessage,
    error: errorRequestTokenAndSendMessage,
  } = useRequestTokenAndSendMessage()
  useToastError<ApiRequestTokenResponse>(
    errorRequestTokenAndSendMessage,
    'Create account failed',
    (e) => e.message
  )

  const [message, setMessage] = useState('')
  const { mutate: sendMessage, error } = useSendMessage()
  useToastError(error, 'Message failed to send, please try again')

  useEffect(() => {
    if (isTouchDevice()) return
    textAreaRef.current?.focus()
  }, [])
  useEffect(() => {
    if (replyTo) textAreaRef.current?.focus()
  }, [replyTo])

  useEffect(() => {
    setIsRequestingEnergy(false)
  }, [hasEnoughEnergy])

  console.log({ hasEnoughEnergy })

  const shouldSendMessage =
    isRequestingEnergy || (isLoggedIn && hasEnoughEnergy)
  const isDisabled = !processMessage(message)

  const resetForm = () => {
    setMessage('')
    clearReplyTo?.()
  }
  const handleSubmit = (captchaToken: string | null, e?: SyntheticEvent) => {
    e?.preventDefault()
    if (
      shouldSendMessage &&
      'virtualKeyboard' in navigator &&
      typeof (navigator.virtualKeyboard as any).show === 'function'
    ) {
      ;(navigator.virtualKeyboard as any).show()
    }

    const processedMessage = processMessage(message)
    if (isDisabled) return

    if (shouldSendMessage) {
      resetForm()
      sendMessage({
        message: processedMessage,
        rootPostId: postId,
        replyTo,
      })
    } else {
      if (isLoggedIn) {
        sendEvent('request energy')
      } else {
        sendEvent('send first message', { chatId: postId, name: topicName })
      }
      if (!captchaToken) return
      resetForm()
      requestTokenAndSendMessage({
        captchaToken,
        message: processMessage(message),
        rootPostId: postId,
        replyTo,
      })
      setIsRequestingEnergy(true)
      sendEvent('request energy and send message')
    }

    onSubmit?.()
  }

  return (
    <CaptchaInvisible>
      {(runCaptcha) => {
        const submitForm = async (e?: SyntheticEvent) => {
          console.log({ shouldSendMessage })
          if (shouldSendMessage) {
            handleSubmit(null, e)
            return
          }
          const token = await runCaptcha()
          handleSubmit(token, e)
        }

        return (
          <form
            onSubmit={submitForm}
            {...props}
            className={cx('flex w-full', className)}
          >
            <TextArea
              onEnterToSubmitForm={submitForm}
              ref={textAreaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder='Message...'
              rows={1}
              autoComplete='off'
              autoCapitalize='sentences'
              autoCorrect='off'
              spellCheck='false'
              variant='fill'
              pill
              rightElement={(classNames) => (
                <div
                  onTouchEnd={(e) => {
                    if (shouldSendMessage) {
                      e.preventDefault()
                      submitForm()
                    }
                  }}
                  onClick={submitForm}
                  className={cx(
                    buttonStyles({
                      size: 'circle',
                      variant: isDisabled ? 'mutedOutline' : 'primary',
                    }),
                    classNames,
                    'cursor-pointer'
                  )}
                >
                  <Send className='relative top-px h-4 w-4' />
                </div>
              )}
            />
          </form>
        )
      }}
    </CaptchaInvisible>
  )
}
