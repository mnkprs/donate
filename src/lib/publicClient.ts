import { createPublicClient, http } from "viem";
import { base, baseSepolia } from "wagmi/chains";

import { ROUTER_SUPPORTED_CHAIN_IDS, type RouterChainId } from "@/lib/contracts";

/**
 * Reads the RPC URL environment variable for a supported chain.
 *
 * Each branch uses a literal `process.env.NEXT_PUBLIC_*` property access (never
 * a computed key) so Next.js inlines the value at build time — mirroring the
 * exact pattern used in `wagmi.ts`.
 */
const readRpcUrl = (chainId: RouterChainId): string | undefined => {
  switch (chainId) {
    case base.id:
      return process.env.NEXT_PUBLIC_BASE_RPC_URL;
    case baseSepolia.id:
      return process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL;
  }
};

const isSupportedChainId = (chainId: number): chainId is RouterChainId =>
  (ROUTER_SUPPORTED_CHAIN_IDS as readonly number[]).includes(chainId);

/**
 * Returns a viem `PublicClient` for the given chain, configured with the
 * project's existing RPC env vars (`NEXT_PUBLIC_BASE_RPC_URL` /
 * `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL`). No new env vars are introduced.
 *
 * Creates a fresh client per call — callers that want long-lived clients should
 * cache the result themselves. Throws for unsupported chain IDs so the receipt
 * verification pipeline fails fast rather than silently using a wrong network.
 *
 * @param chainId Active chain ID — must be Base or Base Sepolia.
 * @throws {Error} When `chainId` is not supported by the router.
 */
export function getPublicClient(chainId: number) {
  if (!isSupportedChainId(chainId)) {
    throw new Error(
      `getPublicClient: unsupported chain id ${chainId}. Must be Base (${base.id}) or Base Sepolia (${baseSepolia.id}).`,
    );
  }

  const rpcUrl = readRpcUrl(chainId);

  return createPublicClient({
    transport: http(rpcUrl),
  });
}
