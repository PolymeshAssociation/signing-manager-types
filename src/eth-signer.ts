import { SigningManager } from './signing-manager';
import { HexString } from './utils';

/**
 * An Ethereum transaction, ready to be signed
 *
 * Every field is populated by the SDK. A signer must pass the request through to the
 * wallet/provider as given: it must not estimate gas, fetch a nonce, alter the transaction type or
 * substitute its own destination address. Doing any of those reintroduces failure modes the SDK
 * deliberately avoids (most notably wallet gas estimation, which produces a nonsensical fee on a
 * chain whose block gas limit is `u64::MAX`)
 *
 * @note fields are EIP-1193 wire format: 0x-prefixed hex, never `number` or `bigint`. A signer
 *   built on viem or ethers must convert them, and map `gas` to that library's gas limit field
 */
export interface EthTransactionRequest {
  /**
   * 0x-prefixed H160 of the signing key. This is the Ethereum address the SDK derived from the
   * SS58 signing Account, and must be one of the addresses the manager reported through
   * `getAccounts()`
   */
  from: HexString;
  /**
   * The runtime pallets sentinel address, supplied by the SDK. Dispatching to it is what makes the
   * `data` payload execute as a Polymesh runtime call rather than as an EVM contract call.
   * A signer must never derive or override this value
   */
  to: HexString;
  /**
   * The SCALE-encoded `RuntimeCall` to dispatch. This is *not* EVM calldata and cannot be ABI
   * decoded
   */
  data: HexString;
  /**
   * Always zero. Value transfer is expressed through the encoded `RuntimeCall`, never through the
   * Ethereum transaction
   */
  value: '0x0';
  /**
   * Gas limit, supplied by the SDK from its dry run of the call.
   *
   * The signer must **not** estimate gas or let the wallet estimate it
   */
  gas: HexString;
  /**
   * The chain's Ethereum chain ID, read from chain constants by the SDK.
   *
   * A signer **must** sign for exactly this chain ID. It must never fall back to the chain the
   * provider happens to be connected to — an injected wallet sitting on Ethereum mainnet will
   * otherwise produce a signature this chain rejects, or a valid signature for the wrong chain.
   * Verify the provider's current chain (and switch, or throw) before signing
   */
  chainId: HexString;
  /**
   * Set when the SDK broadcasts, since it owns nonce sequencing there.
   *
   * Omitted when the wallet broadcasts, in which case the wallet owns the nonce
   */
  nonce?: HexString;
  /**
   * Set (along with `maxPriorityFeePerGas`) when the signer supports EIP-1559, producing a type 2
   * transaction
   */
  maxFeePerGas?: HexString;
  /**
   * Set (along with `maxFeePerGas`) when the signer supports EIP-1559, producing a type 2
   * transaction
   */
  maxPriorityFeePerGas?: HexString;
  /**
   * Set instead of the EIP-1559 fee fields when `EthSignerCapabilities.eip1559` is `false`,
   * producing a legacy (type 0) transaction
   */
  gasPrice?: HexString;
  /**
   * Ethereum transaction type, always set by the SDK. Hex encoded like every other numeric field
   *
   * Only legacy (`0x0`) and EIP-1559 (`0x2`) are emitted. EIP-2930 (`0x1`) is pointless on the
   * sentinel path, and the runtime rejects EIP-4844 (`0x3`) and EIP-7702 (`0x4`)
   */
  type: '0x0' | '0x2';
}

/**
 * Describes what an {@link EthSigner} is able to do, beyond what the presence of its methods
 * already says.
 *
 * Whether a signer can sign or broadcast is expressed by implementing `signTransaction` /
 * `sendTransaction` — not by a flag — so this covers only what cannot be derived from the object's
 * shape
 */
export interface EthSignerCapabilities {
  /**
   * Whether the signer supports EIP-1559 (type 2) transactions. Defaults to `true` when omitted.
   *
   * Set it to `false` for signers that can only encode legacy (type `0x0`) transactions, in which
   * case the SDK populates `gasPrice` instead of the EIP-1559 fee fields.
   *
   * Note this is a question of encoding support, not of cost: the SDK sets
   * `maxPriorityFeePerGas` to zero and `maxFeePerGas` to the chain's gas price, so a type 2
   * transaction here is economically identical to the legacy equivalent
   */
  eip1559?: boolean;
}

/**
 * Signs Polymesh runtime calls with an Ethereum key.
 *
 * At least one of `signTransaction` and `sendTransaction` **must** be implemented. The SDK decides
 * how to submit by looking at which of them is present, so a signer that cannot sign simply does
 * not define `signTransaction`. When both are available the SDK prefers `signTransaction`, as it
 * lets the SDK broadcast the transaction itself and so keeps control of the nonce and of the full
 * submission lifecycle.
 *
 * The SDK will not silently fall back from one mode to the other, because changing who owns the
 * nonce mid-flight is worse than failing loudly.
 *
 * If the user rejects the request, throw an error carrying the
 * [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193#provider-errors) `code` `4001`, which the SDK
 * maps to `TransactionRejectedByUser`. Providers already produce this code, so re-throwing the
 * provider's error unchanged — or preserving its `code` when wrapping it — is usually enough
 */
export interface EthSigner {
  /**
   * What this signer can do beyond what its methods imply. The SDK reads this rather than probing
   * the provider, since probing would mean sending a speculative request to the user's wallet
   */
  readonly capabilities: EthSignerCapabilities;
  /**
   * Sign the transaction and return the raw signed transaction bytes, without broadcasting.
   *
   * Preferred — it lets the SDK broadcast and track the transaction natively, over the existing
   * Polymesh connection, with no Ethereum RPC endpoint involved.
   *
   * Leave undefined if the signer cannot sign without also broadcasting
   */
  signTransaction?(tx: EthTransactionRequest): Promise<HexString>;
  /**
   * Sign **and** broadcast the transaction, returning the Ethereum transaction hash.
   *
   * For wallets that do not expose a sign-only method (most injected EIP-1193 providers). The SDK
   * correlates the returned hash back to a Polymesh extrinsic.
   *
   * Leave undefined if the signer cannot broadcast
   */
  sendTransaction?(tx: EthTransactionRequest): Promise<HexString>;
}

/**
 * A Signing Manager that can sign Polymesh transactions with Ethereum keys.
 *
 * An Ethereum key dispatches a runtime call as the Account
 * `AccountId32 = <20 byte H160> ++ [0xEE; 12]`, so an `EthSigningManager` is a normal
 * {@link SigningManager} whose Accounts happen to be Ethereum derived. It must implement the full
 * `SigningManager` interface:
 *
 * - `getAccounts()` returns the **SS58 encoded** `0xEE` Accounts, *not* H160 hex strings. The SDK
 *   routes on the address, so returning hex would break Account resolution everywhere
 * - `setSs58Format()` is honoured when encoding those Accounts. The SDK calls it before
 *   `getAccounts()`, but the manager should hold a sane default (`42`) for standalone use
 * - `getExternalSigner()` returns a `PolkadotSigner` whose `signPayload` and `signRaw`
 *   **throw**. It is never invoked on the Ethereum path, but the type demands it, and an Ethereum
 *   key cannot produce a valid SCALE/sr25519 signature — a loud throw is required, since a
 *   signature the chain will silently reject is far worse
 *
 * A hybrid manager holding both native and Ethereum keys needs no extra API: routing is
 * per address, and `getEthSigner()` is only consulted for Ethereum derived addresses
 */
export interface EthSigningManager extends SigningManager {
  /**
   * Return the signer that handles Ethereum signing logic.
   *
   * This is synchronous, matching `getExternalSigner()`. Since resolving
   * {@link EthSignerCapabilities} may need an async round trip to the provider, an implementation
   * should resolve them once in its own async `create()` factory and hand back a ready made signer
   * here.
   *
   * It takes no address: the signer receives the address to sign for as
   * {@link EthTransactionRequest.from}, so a single signer must handle every Ethereum derived
   * Account the manager reports through `getAccounts()`
   */
  getEthSigner(): EthSigner;
}

/**
 * Whether the given Signing Manager can sign Polymesh transactions with Ethereum keys
 */
export function isEthSigningManager(
  manager: SigningManager | null | undefined
): manager is EthSigningManager {
  return !!manager && typeof (manager as EthSigningManager).getEthSigner === 'function';
}
