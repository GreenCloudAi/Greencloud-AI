"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { NavigationBar } from "@/components/common/NavigationBar";

export const ONBOARDING_RETURN_KEY = "gc_onboarding_return";

interface AccountStatusContextValue {
  hasAccount: boolean;
  setHasAccount: (present: boolean) => void;
  refreshAccountStatus: () => Promise<void>;
}

const AccountStatusContext = createContext<AccountStatusContextValue>({
  hasAccount: false,
  setHasAccount: () => {},
  refreshAccountStatus: async () => {},
});

export function AccountStatusProvider({
  initialHasAccount,
  children,
}: {
  initialHasAccount: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [hasAccount, setHasAccount] = useState<boolean>(initialHasAccount);

  useEffect(() => {
    if (!pathname || typeof window === "undefined") return;
    if (pathname.startsWith("/dashboard")) {
      window.sessionStorage.setItem(ONBOARDING_RETURN_KEY, "/dashboard");
    } else if (!pathname.startsWith("/onboarding")) {
      window.sessionStorage.setItem(ONBOARDING_RETURN_KEY, "/");
    }
  }, [pathname]);

  const refreshAccountStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/cloud-accounts");
      if (!res.ok) return;
      const accounts = await res.json();
      setHasAccount(Array.isArray(accounts) && accounts.length > 0);
    } catch {
      // keep existing status on transient failure
    }
  }, []);

  return (
    <AccountStatusContext.Provider
      value={{ hasAccount, setHasAccount, refreshAccountStatus }}
    >
      {children}
    </AccountStatusContext.Provider>
  );
}

export function useAccountStatus() {
  return useContext(AccountStatusContext);
}

/**
 * Renders NavigationBar persistently across all public & onboarding routes while hiding on the dashboard workspace.
 */
export function PersistentNavigationShell() {
  const pathname = usePathname();
  if (pathname?.startsWith("/dashboard")) {
    return null;
  }
  return <NavigationBar />;
}
