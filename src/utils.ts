export { SignerPayloadJSON, SignerPayloadRaw, SignerResult } from '@polkadot/types/types';
export { TypeRegistry } from '@polkadot/types';
export { hexToU8a, u8aToHex } from '@polkadot/util';
export { blake2AsU8a, decodeAddress, encodeAddress } from '@polkadot/util-crypto';
export { HexString } from '@polkadot/util/types';

/**
 * Expected chain signed extensions any internal `TypeRegistry` should use
 */
export const signedExtensions = [
  'CheckSpecVersion',
  'CheckTxVersion',
  'CheckGenesis',
  'CheckMortality',
  'CheckNonce',
  'CheckWeight',
  'ChargeTransactionPayment',
];
