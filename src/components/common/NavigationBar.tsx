"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAccountStatus } from "@/components/common/AccountStatusContext";

interface NavTabItem {
  label: string;
  href: string;
  sectionId?: string;
  group: "sections" | "guides";
}

interface IndicatorBox {
  left: number;
  width: number;
  visible: boolean;
}

const NAV_TABS: NavTabItem[] = [
  { label: "Overview", href: "/", sectionId: "overview", group: "sections" },
  { label: "Actions", href: "/#optimization", sectionId: "optimization", group: "sections" },
  { label: "Integrations", href: "/#integrations", sectionId: "integrations", group: "sections" },
  { label: "How it works", href: "/how-it-works", group: "guides" },
  { label: "Why?", href: "/why", group: "guides" },
  { label: "Docs", href: "/docs", group: "guides" },
];

const HOME_SCROLL_SECTIONS = NAV_TABS.filter((t) => t.group === "sections");
const PREFETCH_ROUTES = [
  "/",
  "/how-it-works",
  "/why",
  "/docs",
  "/dashboard",
  "/onboarding",
  "/audit-history",
];

let hasPrefetchedRoutes = false;
let hasWarmedDevRoutes = false;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function NavigationBar() {
  const { hasAccount } = useAccountStatus();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeHomeHref, setActiveHomeHref] = useState<string>("/");
  const [pendingRouteHref, setPendingRouteHref] = useState<string | null>(null);
  const [enableIndicatorMotion, setEnableIndicatorMotion] = useState<boolean>(false);
  const [indicator, setIndicator] = useState<IndicatorBox>({
    left: 0,
    width: 0,
    visible: false,
  });

  const pathname = usePathname();
  const router = useRouter();
  const headerRef = useRef<HTMLElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const navTrackRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const scrollTargetLockRef = useRef<{ y: number; until: number } | null>(null);
  const hasMeasuredOnceRef = useRef<boolean>(false);

  const effectivePath = pendingRouteHref ?? pathname;
  const activeTabHref =
    effectivePath === "/"
      ? activeHomeHref
      : NAV_TABS.find((t) => t.group === "guides" && t.href === effectivePath)?.href ??
        (effectivePath.startsWith("/#") ? effectivePath : "");

  useEffect(() => {
    setPendingRouteHref(null);
  }, [pathname]);

  useEffect(() => {
    if (!hasPrefetchedRoutes) {
      hasPrefetchedRoutes = true;
      PREFETCH_ROUTES.forEach((route) => router.prefetch(route));
    }
  }, [router]);

  // Quietly warm uncompiled routes in dev mode once idle so first clicks don't pause
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "development" ||
      hasWarmedDevRoutes ||
      typeof window === "undefined"
    ) {
      return;
    }
    hasWarmedDevRoutes = true;

    let cancelled = false;
    const warmSequentially = async () => {
      for (const route of PREFETCH_ROUTES) {
        if (cancelled) break;
        if (route === window.location.pathname) continue;
        try {
          await fetch(route, {
            headers: { RSC: "1" },
          });
        } catch {
          // ignore network errors during background warm-up
        }
      }
    };

    const timer = window.setTimeout(() => {
      void warmSequentially();
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const getHeaderOffset = useCallback(() => {
    const h = headerRef.current?.offsetHeight ?? 84;
    return h + 12;
  }, []);

  const smoothScrollToSection = useCallback(
    (sectionId?: string, retriesLeft = 20) => {
      if (typeof window === "undefined") return;
      const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";

      if (!sectionId || sectionId === "overview") {
        scrollTargetLockRef.current = {
          y: 0,
          until: Date.now() + 1800,
        };
        window.scrollTo({ top: 0, behavior });
        return;
      }

      const target = document.getElementById(sectionId);
      if (!target) {
        if (retriesLeft > 0) {
          window.requestAnimationFrame(() =>
            smoothScrollToSection(sectionId, retriesLeft - 1)
          );
        }
        return;
      }

      const targetY = Math.max(
        0,
        target.getBoundingClientRect().top + window.scrollY - getHeaderOffset()
      );
      scrollTargetLockRef.current = {
        y: targetY,
        until: Date.now() + 2000,
      };
      window.scrollTo({ top: targetY, behavior });
    },
    [getHeaderOffset]
  );

  // Sync home hash scrolling immediately on mount + continuous scroll spy
  useEffect(() => {
    if (pathname !== "/") return;

    const scrollFromCurrentHash = (): boolean => {
      const initialHash = window.location.hash.replace("#", "");
      if (!initialHash) return false;
      const matched = HOME_SCROLL_SECTIONS.find((s) => s.sectionId === initialHash);
      if (!matched) return false;

      setActiveHomeHref(matched.href);
      // Lock scroll-spy synchronously before targetY is resolved so initial y=0 never snaps back to Overview
      scrollTargetLockRef.current = {
        y: -1,
        until: Date.now() + 2200,
      };
      window.requestAnimationFrame(() => smoothScrollToSection(initialHash));
      return true;
    };

    const didMatchHash = scrollFromCurrentHash();

    const clearLockOnUserScroll = () => {
      scrollTargetLockRef.current = null;
    };

    const updateActiveOnScroll = () => {
      const lock = scrollTargetLockRef.current;
      if (lock) {
        const arrived = lock.y >= 0 && Math.abs(window.scrollY - lock.y) < 28;
        if (arrived) {
          scrollTargetLockRef.current = null;
          return;
        }
        if (Date.now() >= lock.until) {
          scrollTargetLockRef.current = null;
        } else {
          return;
        }
      }

      if (window.scrollY < 80) {
        setActiveHomeHref("/");
        return;
      }

      const triggerLine = window.innerHeight * 0.94;
      let currentHref = "/";
      for (const item of HOME_SCROLL_SECTIONS) {
        if (!item.sectionId) continue;
        const el = document.getElementById(item.sectionId);
        if (el && el.getBoundingClientRect().top <= triggerLine) {
          currentHref = item.href;
        }
      }
      setActiveHomeHref(currentHref);
    };

    if (!didMatchHash) {
      updateActiveOnScroll();
    }
    window.addEventListener("scroll", updateActiveOnScroll, { passive: true });
    window.addEventListener("hashchange", scrollFromCurrentHash);
    window.addEventListener("wheel", clearLockOnUserScroll, { passive: true });
    window.addEventListener("touchstart", clearLockOnUserScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateActiveOnScroll);
      window.removeEventListener("hashchange", scrollFromCurrentHash);
      window.removeEventListener("wheel", clearLockOnUserScroll);
      window.removeEventListener("touchstart", clearLockOnUserScroll);
    };
  }, [pathname, getHeaderOffset, smoothScrollToSection]);

  // Measure and smoothly glide the active pill across tabs in memory (never unmounts between public routes)
  const updateIndicatorRect = useCallback(() => {
    const track = navTrackRef.current;
    if (!track || !activeTabHref) {
      setIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }

    const el = tabRefs.current[activeTabHref];
    if (!el) {
      setIndicator((prev) => ({ ...prev, visible: false }));
      return;
    }

    const targetBox: IndicatorBox = {
      left: el.offsetLeft,
      width: el.offsetWidth,
      visible: true,
    };

    if (!hasMeasuredOnceRef.current) {
      hasMeasuredOnceRef.current = true;
      setEnableIndicatorMotion(false);
      setIndicator(targetBox);
      window.requestAnimationFrame(() => setEnableIndicatorMotion(true));
      return;
    }

    setEnableIndicatorMotion(true);
    setIndicator(targetBox);
  }, [activeTabHref]);

  useEffect(() => {
    updateIndicatorRect();
    const onResize = () => updateIndicatorRect();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [updateIndicatorRect]);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (mobileMenuOpen && barRef.current && !barRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  const handleTabClick = (
    event: React.MouseEvent<HTMLAnchorElement>,
    tab: NavTabItem
  ) => {
    setMobileMenuOpen(false);

    if (tab.group === "sections") {
      if (pathname === "/") {
        event.preventDefault();
        setActiveHomeHref(tab.href);
        window.history.replaceState(null, "", tab.href);
        smoothScrollToSection(tab.sectionId);
      } else {
        setPendingRouteHref(tab.href);
        if (tab.href !== "/") {
          setActiveHomeHref(tab.href);
        } else {
          setActiveHomeHref("/");
        }
      }
      return;
    }

    if (tab.href !== pathname) {
      setPendingRouteHref(tab.href);
    }
  };

  const primaryHref = hasAccount ? "/dashboard" : "/onboarding";
  const secondaryHref = hasAccount ? "/onboarding" : "/dashboard";
  const isSecondaryRoute = effectivePath === secondaryHref;

  const sectionTabs = NAV_TABS.filter((t) => t.group === "sections");
  const guideTabs = NAV_TABS.filter((t) => t.group === "guides");

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 w-full bg-[#FFFDF4]/95 backdrop-blur-md pt-2.5 pb-2.5 mb-2"
    >
      {pendingRouteHref && (
        <div
          aria-hidden="true"
          className="fixed top-0 left-0 right-0 h-[2.5px] bg-[#155E4B]/20 overflow-hidden z-[60]"
        >
          <div className="h-full w-1/2 bg-[#155E4B] rounded-full animate-pulse" />
        </div>
      )}

      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={barRef}
          className="relative bg-[#F5EED6] rounded-full p-1.5 sm:p-2 pl-2.5 sm:pl-3 flex items-center justify-between gap-2 sm:gap-3 flex-nowrap min-w-0 shadow-warm-sm"
        >
          {/* Left: Brand Logo & Wordmark */}
          <Link
            href="/"
            prefetch={true}
            scroll={false}
            onClick={(e) => handleTabClick(e, NAV_TABS[0])}
            aria-label="GreenCloud AI home"
            className="flex items-center gap-2 sm:gap-2.5 min-w-0 shrink-0 group focus:outline-none"
          >
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-[13px] sm:rounded-[14px] bg-[#FFFDF4] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
              <span className="material-symbols-outlined text-[20px] sm:text-[22px] leading-none text-[#1F8A70]">
                eco
              </span>
            </span>
            <span className="font-extrabold text-[15.5px] sm:text-[18px] tracking-[-0.015em] text-[#2E2B1A] whitespace-nowrap">
              GreenCloud AI
            </span>
          </Link>

          {/* Center: Ordered Track with Gliding Selected Pill */}
          <nav
            aria-label="Main navigation"
            className="hidden lg:flex flex-1 items-center justify-center min-w-0"
          >
            <div
              ref={navTrackRef}
              className="relative inline-flex items-center gap-0.5 p-1 rounded-full bg-[#FAF6E8]/85"
            >
              <span
                aria-hidden="true"
                style={{
                  transform: `translateX(${indicator.left}px)`,
                  width: `${indicator.width}px`,
                }}
                className={`pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-[#155E4B] shadow-warm-sm ${
                  enableIndicatorMotion
                    ? "transition-[transform,width,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                    : "transition-none"
                } ${indicator.visible ? "opacity-100" : "opacity-0"}`}
              />

              {sectionTabs.map((tab) => {
                const isActive = activeTabHref === tab.href;
                return (
                  <Link
                    key={tab.href}
                    ref={(el) => {
                      tabRefs.current[tab.href] = el;
                    }}
                    href={tab.href}
                    prefetch={true}
                    scroll={false}
                    onClick={(e) => handleTabClick(e, tab)}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative z-10 px-2.5 xl:px-3.5 py-1.5 rounded-full text-[13px] xl:text-[14px] font-semibold whitespace-nowrap transition-colors duration-200 ${
                      isActive
                        ? "text-[#FFFDF4]"
                        : "text-[#5A5542] hover:text-[#2E2B1A] hover:bg-[#FFFDF4]/60"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}

              <span
                aria-hidden="true"
                className="w-px h-4 bg-[#DFD6B5] mx-1 shrink-0"
              />

              {guideTabs.map((tab) => {
                const isActive = activeTabHref === tab.href;
                return (
                  <Link
                    key={tab.href}
                    ref={(el) => {
                      tabRefs.current[tab.href] = el;
                    }}
                    href={tab.href}
                    prefetch={true}
                    onClick={(e) => handleTabClick(e, tab)}
                    aria-current={isActive ? "page" : undefined}
                    className={`relative z-10 px-2.5 xl:px-3.5 py-1.5 rounded-full text-[13px] xl:text-[14px] font-semibold whitespace-nowrap transition-colors duration-200 ${
                      isActive
                        ? "text-[#FFFDF4]"
                        : "text-[#5A5542] hover:text-[#2E2B1A] hover:bg-[#FFFDF4]/60"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Right: Action Pills + Mobile Menu Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <Link
              href={primaryHref}
              prefetch={true}
              onClick={() => {
                if (primaryHref !== pathname) {
                  setPendingRouteHref(primaryHref);
                }
              }}
              className="h-[40px] sm:h-[44px] px-3.5 sm:px-5 rounded-full active:scale-[0.99] bg-[#FFF76A] hover:bg-[#F5EC50] text-[#2E2B1A] font-bold text-[13px] sm:text-[14px] inline-flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 transition-[background-color,transform] duration-150"
            >
              <span className="material-symbols-outlined icon-filled text-[18px] sm:text-[19px] leading-none">
                {hasAccount ? "dashboard" : "rocket_launch"}
              </span>
              <span>{hasAccount ? "Dashboard" : "Start setup"}</span>
            </Link>

            <Link
              href={secondaryHref}
              prefetch={true}
              onClick={() => {
                if (secondaryHref !== pathname) {
                  setPendingRouteHref(secondaryHref);
                }
              }}
              aria-label={hasAccount ? "Connect AWS account" : "Open live demo"}
              title={hasAccount ? "Connect AWS account" : "Open live demo"}
              className={`hidden sm:inline-flex w-[44px] h-[44px] rounded-full active:scale-[0.99] items-center justify-center shrink-0 transition-[background-color,transform] duration-150 ${
                isSecondaryRoute
                  ? "bg-[#155E4B] text-[#FFFDF4] shadow-warm-sm"
                  : "bg-[#FAF6E8] hover:bg-[#EAE2C7] text-[#2E2B1A]"
              }`}
            >
              <span className="material-symbols-outlined text-[21px] leading-none">
                {hasAccount ? "link" : "play_circle"}
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              className="lg:hidden w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] rounded-full hover:bg-[#EDE3C2] text-[#2E2B1A] inline-flex items-center justify-center shrink-0 transition-colors duration-150"
            >
              <span className="material-symbols-outlined text-[21px] sm:text-[22px] leading-none">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>

          {/* Mobile & Tablet Popover Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden absolute top-[calc(100%+10px)] left-0 right-0 p-3 bg-[#F5EED6] rounded-[30px] shadow-warm-xl flex flex-col gap-1 z-40">
              {sectionTabs.map((tab) => {
                const isActive = activeTabHref === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    prefetch={true}
                    scroll={false}
                    onClick={(e) => handleTabClick(e, tab)}
                    className={`px-4 py-2.5 text-[14.5px] font-semibold rounded-[18px] transition-colors ${
                      isActive
                        ? "bg-[#155E4B] text-[#FFFDF4]"
                        : "text-[#2E2B1A] hover:bg-[#FAF6E8]"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}

              <div className="h-px bg-[#DFD6B5] my-1 mx-2" />

              {guideTabs.map((tab) => {
                const isActive = activeTabHref === tab.href;
                return (
                  <Link
                    key={tab.href}
                    href={tab.href}
                    prefetch={true}
                    onClick={(e) => handleTabClick(e, tab)}
                    className={`px-4 py-2.5 text-[14.5px] font-semibold rounded-[18px] transition-colors ${
                      isActive
                        ? "bg-[#155E4B] text-[#FFFDF4]"
                        : "text-[#2E2B1A] hover:bg-[#FAF6E8]"
                    }`}
                  >
                    {tab.label}
                  </Link>
                );
              })}

              <Link
                href={secondaryHref}
                prefetch={true}
                onClick={() => setMobileMenuOpen(false)}
                className={`sm:hidden px-4 py-2.5 text-[14.5px] font-semibold rounded-[18px] transition-colors ${
                  isSecondaryRoute
                    ? "bg-[#155E4B] text-[#FFFDF4]"
                    : "text-[#155E4B] hover:bg-[#FAF6E8]"
                }`}
              >
                {hasAccount ? "Connect AWS account" : "Live demo"}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
