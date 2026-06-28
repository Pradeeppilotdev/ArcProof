import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { wagmiAdapter } from "./lib/reown";
import ErrorBoundary from "./components/error-boundary";
import App from "./App";
import "./index.css";

window.onerror = (msg, url, line, col, err) => {
  console.error("GLOBAL ERROR:", msg, err?.stack || "");
};

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
