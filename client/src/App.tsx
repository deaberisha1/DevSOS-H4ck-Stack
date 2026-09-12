import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { ApiError } from "./api/client";
import AppRoutes from "./routes";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale data stays on screen while we refetch; the UI marks it stale
      // rather than blanking out.
      staleTime: 5_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: (count, err) => {
        // Never retry a rejection the member has to act on. A 409 in
        // particular is a real outcome, not a transient failure.
        if (err instanceof ApiError) {
          if (err.status >= 400 && err.status < 500) return false;
          return count < 2;
        }
        return count < 2;
      },
    },
    mutations: { retry: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
