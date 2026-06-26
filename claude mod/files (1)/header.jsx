import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "./ui/button";
import { LogoIcon, WalletIcon } from "./icons";
import { shorten } from "../lib/utils";

export default function Header() {
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-[980px] mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[7px] bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_0_1px_rgba(110,107,251,0.25),0_4px_14px_-4px_rgba(110,107,251,0.55)]">
            <LogoIcon className="w-3.5 h-3.5" />
          </div>
          <span className="text-[14px] font-semibold tracking-[-0.01em]">ArcProof</span>
          <span className="text-[10.5px] text-muted-foreground font-mono ml-1 px-1.5 py-0.5 rounded-full border border-border/80">
            Arc Testnet
          </span>
        </div>
        <div className="flex items-center gap-3">
          {!isConnected ? (
            <Button size="sm" onClick={() => connect({ connector: connectors[0] })}>
              <WalletIcon className="w-3.5 h-3.5" />
              Connect Wallet
            </Button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-[12.5px] text-muted-foreground font-mono">{shorten(address)}</span>
              <Button variant="ghost" size="sm" onClick={disconnect}>Disconnect</Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
