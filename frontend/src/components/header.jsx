import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "./ui/button";
import { LogoIcon, WalletIcon } from "./icons";
import { shorten } from "../lib/utils";

export default function Header() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="max-w-[980px] mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
            <LogoIcon className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-sm font-semibold tracking-tight text-primary">ArcProof</span>
            <span className="text-[9px] text-muted-foreground font-mono border border-border rounded-full px-2 py-0.5 leading-none">Arc Testnet</span>
          </div>
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
