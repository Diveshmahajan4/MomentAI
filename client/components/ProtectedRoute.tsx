"use client"; 

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    async function checkUser() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session && pathname !== "/") {
        // If not authenticated, redirect to login
        router.push("/login");
      } else if (session && pathname === "/") {
        // If authenticated and on home page, redirect to dashboard
        // router.push("/dashboard");
      }
      // Otherwise, allow navigation to any authenticated route
    }

    checkUser();
  }, [pathname, router]);

  return children;
}
