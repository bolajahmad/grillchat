import type { Keyring } from '@polkadot/keyring'

export type Signer = ReturnType<Keyring['addFromSeed']>

export async function generateAccount() {
  const { ed25519PairFromSeed, mnemonicGenerate, mnemonicToMiniSecret } =
    await import('@polkadot/util-crypto')
  const { toSubsocialAddress } = await import('@subsocial/utils')

  const mnemonicAlice = mnemonicGenerate()
  const seedAlice = mnemonicToMiniSecret(mnemonicAlice)
  const { publicKey: publicKeyBuffer } = ed25519PairFromSeed(seedAlice)

  const publicKey = Buffer.from(publicKeyBuffer).toString('hex')
  const secretKey = Buffer.from(seedAlice).toString('hex')
  return { publicKey: toSubsocialAddress('0x' + publicKey)!, secretKey }
}

export async function loginWithSecretKey(secretKey: string): Promise<Signer> {
  const { Keyring } = await import('@polkadot/keyring')
  const keyring = new Keyring({ type: 'sr25519' })
  const secret = Buffer.from(secretKey, 'hex')
  const signer = keyring.addFromSeed(secret, {}, 'ed25519')
  return signer
}

export function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-6)}`
}

export function encodeSecretKey(secretKey: string) {
  return Buffer.from(secretKey, 'hex').toString('base64')
}

export function decodeSecretKey(encodedSecretKey: string) {
  return Buffer.from(encodedSecretKey, 'base64').toString('hex')
}
