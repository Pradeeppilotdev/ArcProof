export default function Hero() {
  return (
    <section className="text-center py-8">
      <div className="text-[10px] font-semibold tracking-[0.13em] uppercase text-blue-500 mb-3">
        ZK-Verified Settlement on Arc
      </div>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight">
        USDC only settles when<br />
        <span className="text-blue-500">work is proven</span>
      </h1>
      <p className="mt-3 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
        No human approval. No time-locks. A Groth16 proof gates every payment, end to end.
      </p>
    </section>
  );
}
