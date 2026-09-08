"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    name: "Who We Are",
    href: "#",
    submenu: [
      { name: "Our Mission", href: "/" },
      { name: "Culture & Where We've Worked", href: "/culture" },
      { name: "Charity & Impact", href: "/charity" },
    ],
  },
  {
    name: "What We Do",
    href: "#",
    submenu: [
      { name: "Quant Trading", href: "/quant-trading" },
      { name: "Quant Research", href: "/quant-research" },
      { name: "Equity & Macro Research", href: "/equity-macro-research" },
      { name: "Our Holdings", href: "/holdings" },
      { name: "Strategy & Research", href: "/strategy" },
      { name: "Career Panels", href: "/career-panels" },
    ],
  },
  {
    name: "Research",
    href: "#",
    submenu: [
      { name: "Equity Research", href: "/equity-research" },
      { name: "Our Take", href: "/research" },
      { name: "Learning Hub", href: "/learn" },
    ],
  },
  {
    name: "Leadership",
    href: "/team",
  },
  {
    name: "Join Us",
    href: "/contact",
  },
];

export function Navigation() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  useEffect(() => {
    const scroll = () => setIsScrolled(window.scrollY > 20);
    scroll();
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setOpenDropdown(null);
  }, [pathname]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMobileMenuOpen(false);
        setOpenDropdown(null);
      }
    };
    document.addEventListener("keydown", escape);
    const previous = document.body.style.overflow;
    if (isMobileMenuOpen) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", escape);
      document.body.style.overflow = previous;
    };
  }, [isMobileMenuOpen]);
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <nav
        className={cn(
          "site-nav",
          (isScrolled || pathname !== "/") && "site-nav-solid",
        )}
        aria-label="Main navigation"
      >
        <div className="site-nav-inner">
          <Link href="/" aria-label="St. George Capital home">
            <Image
              src="/images/logo/logo_cropped.png"
              alt="St. George Capital"
              width={192}
              height={48}
              className="nav-logo header-wordmark"
              priority
            />
          </Link>
          <div className="desktop-links">
            {navItems.map((item, index) => (
              <div
                key={item.name}
                className="nav-group"
                onMouseEnter={() => item.submenu && setOpenDropdown(item.name)}
                onMouseLeave={() => setOpenDropdown(null)}
                onBlur={(event) => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                  )
                    setOpenDropdown(null);
                }}
              >
                {item.submenu ? (
                  <button
                    className="nav-trigger"
                    type="button"
                    onClick={() =>
                      setOpenDropdown(
                        openDropdown === item.name ? null : item.name,
                      )
                    }
                    aria-expanded={openDropdown === item.name}
                    aria-controls={`nav-panel-${index}`}
                  >
                    {item.name}
                    <ChevronDown size={12} />
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "nav-trigger",
                      item.name === "Join Us" && "nav-join",
                    )}
                    aria-current={pathname === item.href ? "page" : undefined}
                  >
                    {item.name}
                    {item.name === "Join Us" && (
                      <span aria-hidden="true">↗</span>
                    )}
                  </Link>
                )}
                {item.submenu && (
                  <div
                    id={`nav-panel-${index}`}
                    className="nav-dropdown"
                    hidden={openDropdown !== item.name}
                  >
                    <span className="nav-dropdown-label">{item.name}</span>
                    {item.submenu.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setOpenDropdown(null)}
                      >
                        {sub.name}
                        <span aria-hidden="true">↗</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <Link href="/dashboard" className="nav-dashboard">
              Dashboard
            </Link>
          </div>
          <button
            type="button"
            className="mobile-toggle"
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
        <div
          id="mobile-navigation"
          className="mobile-navigation"
          hidden={!isMobileMenuOpen}
        >
          {navItems.map((item) => (
            <div key={item.name} className="mobile-nav-group">
              {item.submenu ? (
                <>
                  <button
                    type="button"
                    aria-expanded={openDropdown === item.name}
                    onClick={() =>
                      setOpenDropdown(
                        openDropdown === item.name ? null : item.name,
                      )
                    }
                  >
                    {item.name}
                    <ChevronDown size={18} />
                  </button>
                  <div hidden={openDropdown !== item.name}>
                    {item.submenu.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <Link
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                  <span aria-hidden="true">↗</span>
                </Link>
              )}
            </div>
          ))}
          <Link
            href="/dashboard"
            className="mobile-dashboard"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Member Dashboard ↗
          </Link>
        </div>
      </nav>
    </>
  );
}
