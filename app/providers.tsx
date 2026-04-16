"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider refetchInterval={300} refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  );
}
