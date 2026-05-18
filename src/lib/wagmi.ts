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
