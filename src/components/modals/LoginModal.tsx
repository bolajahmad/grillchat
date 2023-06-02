import useLoginAndRequestToken from '@/hooks/useLoginAndRequestToken'
import useToastError from '@/hooks/useToastError'
import { ApiRequestTokenResponse } from '@/pages/api/request-token'
import { AuthenticationMethods, useMyAccount } from '@/stores/my-account'
import { isTouchDevice } from '@/utils/device'
import { getWeb3AuthClientId } from '@/utils/env/client'
import { SyntheticEvent, useRef, useState } from 'react'
import { toast } from 'react-hot-toast'
import Button from '../Button'
import CaptchaInvisible from '../captcha/CaptchaInvisible'
import TextArea from '../inputs/TextArea'
import Toast from '../Toast'
import Modal, { ModalFunctionalityProps } from './Modal'

export type LoginModalProps = ModalFunctionalityProps & {
  afterLogin?: () => void
  beforeLogin?: () => void
  openModal: () => void
}

const PRIVATE_KEY_LENGTH = 64
const hasWeb3AuthID = getWeb3AuthClientId()

export default function LoginModal({
  afterLogin,
  beforeLogin,
  ...props
}: LoginModalProps) {
  const loginWithWeb3Auth = useMyAccount((state) => state.loginWithWeb3Auth)
  const loginAnonymously = useMyAccount((state) => state.loginAnonymously)
  const [secretKey, setSecretKey] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [hasStartCaptcha, setHasStartCaptcha] = useState(false)
  const {
    mutateAsync: loginAndRequestToken,
    isLoading: loadingRequestToken,
    error,
  } = useLoginAndRequestToken()
  useToastError<ApiRequestTokenResponse>(
    error,
    'Create account failed',
    (e) => e.message
  )

  const isLoading = loadingRequestToken || hasStartCaptcha

  const processSecretKey = (secretKey: string) => secretKey.trim()

  const onSubmit =
    (authMethod?: AuthenticationMethods) => async (e: SyntheticEvent) => {
      e.preventDefault()
      beforeLogin?.()
      const processedSecretKey = processSecretKey(secretKey)
      let loginRes
      loginRes =
        authMethod === 'web3auth'
          ? await loginWithWeb3Auth()
          : await loginAnonymously(processedSecretKey)
      if (loginRes) {
        afterLogin?.()
        setSecretKey('')
        props.closeModal()
      } else {
        toast.custom((t) => (
          <Toast
            t={t}
            title='Login Failed'
            description='The grill secret key you provided is not valid'
          />
        ))
      }
    }

  const desc = (
    <span className='flex flex-col'>
      <span>
        To access GrillChat, you need a Grill secret key. If you do not have
        one, just write your first chat message, and you will be given one.
      </span>
      <span className='text-text-red'>
        DO NOT enter the private key of an account that holds any funds, assets,
        NFTs, etc.
      </span>
    </span>
  )

  return (
    <Modal
      {...props}
      withFooter
      initialFocus={isTouchDevice() ? undefined : inputRef}
      title='🔐 Login'
      withCloseButton
      description={desc}
    >
      <form
        onSubmit={onSubmit('anonymous')}
        className='mt-2 flex flex-col gap-4'
      >
        <TextArea
          ref={inputRef}
          value={secretKey}
          rows={3}
          size='sm'
          className='bg-background'
          onChange={(e) =>
            setSecretKey((e.target as HTMLTextAreaElement).value)
          }
          placeholder='Enter your Grill secret key'
        />
        <Button
          disabled={
            !secretKey ||
            processSecretKey(secretKey).length !== PRIVATE_KEY_LENGTH
          }
          type='submit'
          size='lg'
        >
          Login
        </Button>
        <div className='w-full'>
          <CaptchaInvisible>
            {(runCaptcha, termsAndService) => {
              return (
                <>
                  <Button
                    variant='primaryOutline'
                    type='button'
                    size='lg'
                    className='w-full'
                    isLoading={isLoading}
                    onClick={async () => {
                      setHasStartCaptcha(true)
                      const token = await runCaptcha()
                      if (!token) return
                      setHasStartCaptcha(false)
                      await loginAndRequestToken({ captchaToken: token })
                      props.closeModal()
                    }}
                  >
                    Create an account
                  </Button>
                  {termsAndService('mt-5')}
                </>
              )
            }}
          </CaptchaInvisible>
        </div>

        <div className='text-center'>OR</div>

        {!!hasWeb3AuthID && (
          <div className='w-full'>
            <Button
              type='button'
              className='w-full'
              onClick={onSubmit('web3auth')}
              size='lg'
            >
              Login with Web3Auth
            </Button>
          </div>
        )}
      </form>
    </Modal>
  )
}
