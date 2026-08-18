import {
  EthSigner,
  EthSignerCapabilities,
  EthSigningManager,
  EthTransactionRequest,
  isEthSigningManager,
  PolkadotSigner,
  SigningManager,
} from '../index';

const externalSigner = {
  signPayload: () => {
    throw new Error('Ethereum keys cannot sign SCALE payloads');
  },
  signRaw: () => {
    throw new Error('Ethereum keys cannot sign raw payloads');
  },
} as unknown as PolkadotSigner;

const nativeManager: SigningManager = {
  getAccounts: async () => ['5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'],
  getExternalSigner: () => externalSigner,
  setSs58Format: () => undefined,
};

const capabilities: EthSignerCapabilities = { eip1559: true };

const ethSigner: EthSigner = {
  capabilities,
  signTransaction: async () => '0x02f8',
};

const ethManager: EthSigningManager = {
  ...nativeManager,
  getEthSigner: () => ethSigner,
};

describe('EthTransactionRequest', () => {
  test('should accept an EIP-1559 request with an SDK supplied nonce', () => {
    const request: EthTransactionRequest = {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x0000000000000000000000000000000000000901',
      data: '0x0007044142',
      value: '0x0',
      gas: '0x5208',
      chainId: '0x1b39',
      nonce: '0x0',
      maxFeePerGas: '0x3b9aca00',
      maxPriorityFeePerGas: '0x0',
      type: '0x2',
    };

    expect(request.value).toBe('0x0');
    expect(request.type).toBe('0x2');
  });

  test('should accept a legacy request with no nonce, for a wallet that broadcasts', () => {
    const request: EthTransactionRequest = {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x0000000000000000000000000000000000000901',
      data: '0x0007044142',
      value: '0x0',
      gas: '0x5208',
      chainId: '0x1b39',
      gasPrice: '0x3b9aca00',
      type: '0x0',
    };

    expect(request.nonce).toBeUndefined();
    expect(request.gasPrice).toBe('0x3b9aca00');
  });

  test('should not allow a transaction type the SDK never emits', () => {
    const request: EthTransactionRequest = {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x0000000000000000000000000000000000000901',
      data: '0x0007044142',
      value: '0x0',
      gas: '0x5208',
      chainId: '0x1b39',
      // @ts-expect-error the SDK emits only legacy (0x0) and EIP-1559 (0x2) transactions
      type: '0x1',
    };

    expect(request.type).toBe('0x1');
  });

  test('should not allow transaction types rejected by the runtime', () => {
    const request: EthTransactionRequest = {
      from: '0x1234567890123456789012345678901234567890',
      to: '0x0000000000000000000000000000000000000901',
      data: '0x0007044142',
      value: '0x0',
      gas: '0x5208',
      chainId: '0x1b39',
      // @ts-expect-error EIP-4844 (0x3) and EIP-7702 (0x4) are rejected by the runtime
      type: '0x3',
    };

    expect(request.type).toBe('0x3');
  });

  test('should require 0x-prefixed hex for the addresses', () => {
    const request: EthTransactionRequest = {
      // @ts-expect-error an SS58 address is not an H160
      from: '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
      to: '0x0000000000000000000000000000000000000901',
      data: '0x0007044142',
      value: '0x0',
      gas: '0x5208',
      chainId: '0x1b39',
      type: '0x0',
    };

    expect(request.to).toBe('0x0000000000000000000000000000000000000901');
  });
});

describe('EthSigner', () => {
  test('should allow a signer that only signs', () => {
    expect(ethSigner.signTransaction).toBeDefined();
    expect(ethSigner.sendTransaction).toBeUndefined();
  });

  test('should allow a signer that only broadcasts', () => {
    const sender: EthSigner = {
      capabilities: { eip1559: false },
      sendTransaction: async () => '0xabc',
    };

    expect(sender.signTransaction).toBeUndefined();
    expect(sender.capabilities.eip1559).toBe(false);
  });

  test('should allow a signer that supports both modes', () => {
    const both: EthSigner = {
      capabilities: {},
      signTransaction: async () => '0x02f8',
      sendTransaction: async () => '0xabc',
    };

    expect(both.signTransaction).toBeDefined();
    expect(both.sendTransaction).toBeDefined();
  });

  test('should treat omitted eip1559 support as unspecified, i.e. defaulted by the SDK', () => {
    const signer: EthSigner = {
      capabilities: {},
      signTransaction: async () => '0x02f8',
    };

    expect(signer.capabilities.eip1559).toBeUndefined();
  });
});

describe('EthSigningManager', () => {
  test('should implement the full SigningManager interface', async () => {
    const manager: SigningManager = ethManager;

    await expect(manager.getAccounts()).resolves.toEqual([
      '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY',
    ]);
    expect(manager.getExternalSigner()).toBe(externalSigner);
    expect(manager.setSs58Format(12)).toBeUndefined();
  });

  test('should return an EthSigner synchronously', () => {
    expect(ethManager.getEthSigner()).toBe(ethSigner);
  });
});

describe('isEthSigningManager', () => {
  test('should return true for a manager exposing getEthSigner', () => {
    expect(isEthSigningManager(ethManager)).toBe(true);
  });

  test('should return false for a plain Signing Manager', () => {
    expect(isEthSigningManager(nativeManager)).toBe(false);
  });

  test('should return false when getEthSigner is not callable', () => {
    const malformed = { ...nativeManager, getEthSigner: 'nope' } as unknown as SigningManager;

    expect(isEthSigningManager(malformed)).toBe(false);
  });

  test('should return false for a null or undefined manager', () => {
    expect(isEthSigningManager(null)).toBe(false);
    expect(isEthSigningManager(undefined)).toBe(false);
  });

  test('should narrow the type when it returns true', () => {
    const manager: SigningManager = ethManager;

    if (isEthSigningManager(manager)) {
      expect(manager.getEthSigner().capabilities).toBe(capabilities);
    } else {
      throw new Error('expected the manager to be narrowed to an EthSigningManager');
    }
  });
});
