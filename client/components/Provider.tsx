"use client"; 

import { ThemeProvider } from "next-themes";
import { ReactNode, useEffect, useState } from "react";

export default function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    console.log("Is not mounted");
    return <>{children}</>; 
  }

  return <ThemeProvider attribute="class">{children}</ThemeProvider>;
}