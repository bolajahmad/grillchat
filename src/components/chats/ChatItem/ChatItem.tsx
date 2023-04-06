import AddressAvatar from '@/components/AddressAvatar'
import Button from '@/components/Button'
import LinkText from '@/components/LinkText'
import { useSendEvent } from '@/stores/analytics'
import { truncateAddress } from '@/utils/account'
import { cx } from '@/utils/class-names'
import { getTimeRelativeToNow } from '@/utils/date'
import { generateRandomColor } from '@/utils/random-colors'
import Linkify from 'linkify-react'
import { ComponentProps, useReducer } from 'react'
import { IoCheckmarkDoneOutline, IoCheckmarkOutline } from 'react-icons/io5'
import CheckMarkExplanationModal, {
  CheckMarkModalVariant,
} from './CheckMarkExplanationModal'
import RepliedMessagePreview from './RepliedMessagePreview'

export type ChatItemProps = Omit<ComponentProps<'div'>, 'children'> & {
  text: string
  senderAddress: string
  sentDate: Date | string | number
  isSent?: boolean
  isMyMessage?: boolean
  cid?: string
  blockNumber?: number
  replyTo?: string
}

type CheckMarkModalReducerState = {
  isOpen: boolean
  variant: CheckMarkModalVariant | ''
}
const checkMarkModalReducer = (
  state: CheckMarkModalReducerState,
  action: CheckMarkModalVariant | ''
): CheckMarkModalReducerState => {
  if (action === '') {
    return { ...state, isOpen: false }
  }
  return { isOpen: true, variant: action }
}

export default function ChatItem({
  text,
  senderAddress,
  sentDate,
  isSent,
  isMyMessage,
  blockNumber: blockHash,
  cid,
  replyTo,
  ...props
}: ChatItemProps) {
  const sendEvent = useSendEvent()

  const [checkMarkModalState, dispatch] = useReducer(checkMarkModalReducer, {
    isOpen: false,
    variant: '',
  })
  const relativeTime = getTimeRelativeToNow(sentDate)
  const senderColor = generateRandomColor(senderAddress)

  const onCheckMarkClick = () => {
    const checkMarkType: CheckMarkModalVariant = isSent
      ? 'recorded'
      : 'recording'
    sendEvent('click check_mark_button', { type: checkMarkType })
    dispatch(checkMarkType)
  }

  return (
    <div
      {...props}
      className={cx(
        'flex items-start justify-start gap-2',
        isMyMessage && 'flex-row-reverse',
        props.className
      )}
    >
      {!isMyMessage && (
        <AddressAvatar address={senderAddress} className='flex-shrink-0' />
      )}
      <div
        className={cx(
          'relative flex flex-col gap-0.5 overflow-hidden rounded-2xl py-1.5 px-2.5',
          isMyMessage ? 'bg-background-primary' : 'bg-background-light'
        )}
      >
        {!isMyMessage && (
          <div className='flex items-center'>
            <span
              className='mr-2 text-sm text-text-secondary'
              style={{ color: senderColor }}
            >
              {truncateAddress(senderAddress)}
            </span>
            <span className='text-xs text-text-muted'>{relativeTime}</span>
          </div>
        )}
        {replyTo && (
          <RepliedMessagePreview
            originalMessage={text}
            className='mt-1'
            replyTo={replyTo}
          />
        )}
        <p className='whitespace-pre-wrap break-words text-base'>
          <Linkify
            options={{
              render: ({ content, attributes }) => (
                <LinkText
                  {...attributes}
                  href={attributes.href}
                  variant={isMyMessage ? 'default' : 'secondary'}
                  className={cx('underline')}
                  openInNewTab
                >
                  {content}
                </LinkText>
              ),
            }}
          >
            {text}
          </Linkify>
        </p>
        {isMyMessage && (
          <div
            className={cx('flex items-center gap-1', isMyMessage && 'self-end')}
          >
            <span className='text-xs text-text-muted'>{relativeTime}</span>
            <Button
              variant='transparent'
              size='noPadding'
              interactive='brightness-only'
              onClick={onCheckMarkClick}
            >
              {isSent ? (
                <IoCheckmarkDoneOutline className='text-sm' />
              ) : (
                <IoCheckmarkOutline className={cx('text-sm text-text-muted')} />
              )}
            </Button>
          </div>
        )}
      </div>
      <CheckMarkExplanationModal
        isOpen={checkMarkModalState.isOpen}
        variant={checkMarkModalState.variant || 'recording'}
        closeModal={() => dispatch('')}
        blockNumber={blockHash}
        cid={cid}
      />
    </div>
  )
}