[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/standard/semistandard)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

# Polymesh Signing Manager Types

This defines the types needed to implement a [Polymesh SDK](https://github.com/PolymeshAssociation/polymesh-sdk) signing manager, along with exporting some commonly needed utilities for implementations

A signing manager abstracts the cryptographic signing of transactions so the SDK is indifferent to where and how private keys are stored.

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
