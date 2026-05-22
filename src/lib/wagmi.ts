import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

const isProd = process.env.NEXT_PUBLIC_CHAIN === "base";

export const config = createConfig({
  chains: isProd ? [base] : [baseSepolia],
  ssr: true,
  transports: {
    [base.id]: http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
    [baseSepolia.id]: http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

// Router contract surface (Epic 4). Re-exported here so consumers reach the
// wagmi config and the on-chain router address through one module.
export {
  DONATION_ROUTED_EVENT,
  ROUTER_SUPPORTED_CHAIN_IDS,
  decodeDonationRoutedLog,
  getRouterAddress,
} from "./contracts";
export type { DonationRoutedArgs, RawEventLog } from "./contracts";
