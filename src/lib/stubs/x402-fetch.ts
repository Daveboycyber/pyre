/**
 * Stub for optional @x402/fetch. Pyre does not use HTTP 402 payments.
 */
export function wrapFetchWithPayment(fetchImpl: typeof fetch = fetch) {
  return fetchImpl;
}

export function x402Client() {
  return {};
}

export function x402HTTPClient() {
  return {};
}

export default {};
