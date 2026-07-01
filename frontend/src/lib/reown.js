import { createAppKit } from "@reown/appkit/react";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { arcTestnet } from "./wagmi";

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID || "YOUR_PROJECT_ID_FROM_REOWN_CLOUD";

const metadata = {
  name: "ArcZK",
  description: "ZK-verified USDC settlement on Arc testnet",
  url: window.location.origin,
  icons: ["/favicon.ico"],
};

const networks = [arcTestnet];

const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false,
});

createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: { analytics: false },
  customRpcUrls: {
    "eip155:5042002": [{ url: "https://rpc.testnet.arc.network" }],
  },
});

export { wagmiAdapter };
