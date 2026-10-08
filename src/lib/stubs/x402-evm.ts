/**
 * Stub for optional @x402/evm (Coinbase HTTP 402 payments).
 * A transitive dependency imports it; Pyre does not use x402.
 */
export function toClientEvmSigner(): never {
  throw new Error("x402 payments are not used by Pyre");
}

export class ExactEvmScheme {
  constructor(..._args: unknown[]) {
    throw new Error("x402 payments are not used by Pyre");
  }
}

export default {};
