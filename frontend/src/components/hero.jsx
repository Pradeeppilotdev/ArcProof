export default function Hero() {
  return (
    <section className="text-center pt-10 sm:pt-14 pb-6 sm:pb-8 animate-fade-up">
      <div className="text-[9px] font-semibold tracking-[0.15em] uppercase text-white/40 mb-4 sm:mb-5">
        ZK-verified settlement on Arc
      </div>
      <h1 className="text-[28px] sm:text-[36px] md:text-[44px] font-semibold leading-[1.1] tracking-[-0.02em] text-white px-2 sm:px-0">
        USDC only settles when<br />
        <span className="text-[#c47b5a]">work is proven</span>
      </h1>
      <p className="mt-3 text-sm text-white/70 max-w-md mx-auto leading-relaxed px-4 sm:px-0">
        No human approval. No time-locks. A Groth16 proof gates every payment, end to end.
      </p>
    </section>
  );
}
