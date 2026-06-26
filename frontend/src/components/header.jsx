import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "./ui/button";
import { LogoIcon, WalletIcon } from "./icons";
import { shorten } from "../lib/utils";

export default function Header() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-transparent backdrop-blur-sm">
      <div className="max-w-[980px] mx-auto px-4 sm:px-6 h-12 sm:h-14 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center shrink-0">
            <LogoIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-primary whitespace-nowrap">ArcProof</span>
          <span className="hidden sm:inline-flex text-[9px] text-muted-foreground font-mono border border-border rounded-full px-2 py-0.5 leading-none">Arc Testnet</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!isConnected ? (
            <Button size="sm" onClick={() => connect({ connector: connectors[0] })} className="text-xs sm:text-sm px-2 sm:px-3">
              <WalletIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Connect Wallet</span>
              <span className="sm:hidden">Connect</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[11px] sm:text-xs text-muted-foreground font-mono">{shorten(address)}</span>
              <Button variant="ghost" size="sm" onClick={disconnect} className="text-xs sm:text-sm">Disconnect</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
