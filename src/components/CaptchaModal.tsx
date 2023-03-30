import Captcha from '@/components/Captcha'
import Modal, { ModalFunctionalityProps } from '@/components/Modal'
import Toast from '@/components/Toast'
import useLoginAndRequestToken from '@/hooks/useLoginAndRequestToken'
import useRequestTokenAndSendMessage from '@/hooks/useRequestTokenAndSendMessage'
import { ApiRequestTokenResponse } from '@/pages/api/request-token'
import { SendMessageParams } from '@/services/subsocial/commentIds'
import { useSendEvent } from '@/stores/analytics'
import { useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { IoWarningOutline } from 'react-icons/io5'

export type CaptchaModalProps = ModalFunctionalityProps & {
  messageData?: SendMessageParams
} & {
  onSubmit?: () => void
}

export default function CaptchaModal({
  messageData,
  onSubmit,
  ...props
}: CaptchaModalProps) {
  const sendEvent = useSendEvent()
  const {
    mutateAsync: requestTokenAndSendMessage,
    error: errorRequestTokenAndSendMessage,
  } = useRequestTokenAndSendMessage()
  const {
    mutateAsync: loginAndRequestToken,
    error: errorLoginAndRequestToken,
  } = useLoginAndRequestToken()

  const error = errorLoginAndRequestToken || errorRequestTokenAndSendMessage
  useEffect(() => {
    if (error) {
      let message: string | undefined = (error as any)?.message

      const response = (error as any)?.response?.data
      const responseMessage = (response as ApiRequestTokenResponse)?.message
      if (responseMessage) message = responseMessage

      toast.custom((t) => (
        <Toast
          t={t}
          icon={(classNames) => <IoWarningOutline className={classNames} />}
          title='Sign up failed, please try again'
          description={message}
        />
      ))
    }
  }, [error])

  const submitCaptcha = async (token: string) => {
    if (messageData) {
      requestTokenAndSendMessage({
        captchaToken: token,
        ...messageData,
      })
    } else {
      loginAndRequestToken({ captchaToken: token })
    }
    sendEvent('submit captcha and send message')
    props.closeModal()
    onSubmit?.()
  }

  return (
    <Modal
      {...props}
      size='sm'
      titleClassName='text-center'
      title='🤖 Are you a human?'
    >
      <div className='flex flex-col items-stretch gap-6 py-4'>
        <div className='flex flex-col items-center'>
          <Captcha onVerify={submitCaptcha} />
        </div>
      </div>
    </Modal>
  )
}