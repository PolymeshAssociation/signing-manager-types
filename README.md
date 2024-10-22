[![js-semistandard-style](https://img.shields.io/badge/code%20style-semistandard-brightgreen.svg?style=flat-square)](https://github.com/standard/semistandard)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

# Polymesh Signing Manager Types

This defines the types needed to implement a [Polymesh SDK](https://github.com/PolymeshAssociation/polymesh-sdk) signing manager, along with exporting some commonly needed utilities for implementations

A signing manager abstracts the cryptographic signing of transactions so the SDK is indifferent to where and how private keys are stored.

Implementations:
- [Local](https://github.com/PolymeshAssociation/local-signing-manager) Private keys are typically encoded as 12 word mnemonics
- [Hashicorp Vault](https://github.com/PolymeshAssociation/hashicorp-vault-signing-manager) Private keys are stored in a [Vault transit engine](https://developer.hashicorp.com/vault/docs/secrets/transit)