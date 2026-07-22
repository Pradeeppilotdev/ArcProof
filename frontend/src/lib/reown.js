import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { arcTestnet } from "./wagmi";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || "YOUR_PROJECT_ID_FROM_REOWN_CLOUD";
const rpcUrl = import.meta.env.VITE_ARC_RPC_URL || "https://rpc.testnet.arc.network";

const metadata = {
  name: "ArcZK",
  description: "ZK-verified USDC settlement on Arc testnet",
  url: window.location.origin,
  icons: ["/favicon.ico"],
};

const networks = [arcTestnet];

const customRpcUrls = {
  "eip155:5042002": [{ url: rpcUrl }],
};

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
  customRpcUrls,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  defaultNetwork: arcTestnet,
  features: { analytics: false },
  customRpcUrls,
});

export { wagmiAdapter };
