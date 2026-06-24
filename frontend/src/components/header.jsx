import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "./ui/button";
import { LogoIcon, WalletIcon } from "./icons";
import { shorten } from "../lib/utils";

export default function Header() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <header className="border-b border-border">
      <div className="max-w-[980px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-blue-500 text-white flex items-center justify-center">
            <LogoIcon className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold">ArcProof</span>
          <span className="text-[10px] text-muted-foreground font-mono">Arc Testnet</span>
        </div>
        <div className="flex items-center gap-3">
          {!isConnected ? (
            <Button size="sm" onClick={() => connect({ connector: connectors[0] })}>
              <WalletIcon className="w-3.5 h-3.5" />
              Connect Wallet
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono">{shorten(address)}</span>
              <Button variant="ghost" size="sm" onClick={disconnect}>Disconnect</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
