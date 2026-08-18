[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/standard/semistandard)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

# Polymesh Signing Manager Types

This defines the types needed to implement a [Polymesh SDK](https://github.com/PolymeshAssociation/polymesh-sdk) signing manager, along with exporting some commonly needed utilities for implementations

A signing manager abstracts the cryptographic signing of transactions so the SDK is indifferent to where and how private keys are stored.

### Ethereum signing managers

Polymesh's `revive` pallet lets an Ethereum key dispatch any runtime call, as the account `AccountId32 = <20 byte H160> ++ [0xEE; 12]`. A signing manager holding Ethereum keys implements `EthSigningManager`, which extends `SigningManager` with a single synchronous `getEthSigner()` method. The SDK routes on the signing address, so this capability is additive — existing signing managers are unaffected, and a hybrid manager may hold both native and Ethereum keys.

- `EthTransactionRequest` — the Ethereum transaction the SDK builds. Every field is supplied by the SDK, including the gas limit and the chain ID; a signer must not estimate gas, substitute its own values, or sign for whichever chain the provider happens to be connected to. Fields are EIP-1193 wire format (0x-prefixed hex), so a signer built on viem or ethers must convert them, and map `gas` to that library's gas limit field
- `EthSigner` — implements `signTransaction` (returns raw signed bytes for the SDK to broadcast — preferred) and/or `sendTransaction` (the wallet broadcasts and returns the Ethereum transaction hash). At least one is required, and the SDK decides which to use from whichever is present rather than from a flag
- `EthSignerCapabilities` — what cannot be derived from the signer's shape. Currently just `eip1559`, which defaults to `true` and is set to `false` by signers that can only encode legacy (type `0x0`) transactions
- `isEthSigningManager(manager)` — typeguard for consumers routing between the native and Ethereum paths

A user rejecting the request should surface as an error carrying the [EIP-1193](https://eips.ethereum.org/EIPS/eip-1193#provider-errors) code `4001`; the SDK maps that to `TransactionRejectedByUser`. Re-throwing the provider's own error, or preserving its `code` when wrapping it, is usually enough.

An `EthSigningManager` still implements the whole `SigningManager` interface: `getAccounts()` returns the SS58 encoded `0xEE` accounts (not H160 hex), `setSs58Format()` is honoured when encoding them, and `getExternalSigner()` returns a `PolkadotSigner` whose `signPayload` and `signRaw` throw — an Ethereum key cannot produce a signature the chain will accept over a SCALE payload.

### Implementations

- [Browser](https://github.com/PolymeshAssociation/browser-extension-signing-manager) Private keys are saved in a browser extension
- [WalletConnect](https://github.com/PolymeshAssociation/walletconnect-signing-manager) Formerly WalletConnect adaptor (rebranded to Reown)
- [Local](https://github.com/PolymeshAssociation/local-signing-manager) Private keys are loaded into memory for backend environments like Node.js
- [Hashicorp Vault](https://github.com/PolymeshAssociation/hashicorp-vault-signing-manager) Private keys are stored in a [Vault transit engine](https://developer.hashicorp.com/vault/docs/secrets/transit)

The signing manager API allows for more specialized signers to be implemented. The linked packages are not reccomended for general use and require access to a 3rd party API. Linked for completness, and to provide examples for more advance use cases.

### Custom Implementations

- [Azure](https://github.com/PolymeshAssociation/azure-signing-manager) Keys are held in Microsoft Azure
- [Fireblocks](https://github.com/PolymeshAssociation/fireblocks-signing-manager) Keys are held in Fireblocks
- [Approval](https://github.com/PolymeshAssociation/approval-signing-manager) Demonstrates a "cold wallet" type approach
