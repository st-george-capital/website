'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  {
    name: 'Who We Are',
    href: '#',
    submenu: [
      { name: 'Our Mission', href: '/' },
      { name: 'Culture', href: '/culture' },
      { name: 'Leadership Team', href: '/team' },
      { name: 'Charity & Impact', href: '/charity' },
    ],
  },
  {
    name: 'What We Do',
    href: '#',
    submenu: [
      { name: 'Quant Trading', href: '/quant-trading' },
      { name: 'Quant Research', href: '/quant-research' },
      { name: 'Equity & Macro Research', href: '/equity-macro-research' },
      { name: 'Our Holdings', href: '/holdings' },
      { name: 'Strategy & Research', href: '/strategy' },
    ],
  },
  {
    name: 'Research',
    href: '/research',
  },
  {
    name: 'Career Panels',
    href: '/career-panels',
  },
  {
    name: 'Join Us',
    href: '/contact',
  },
];

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleMouseEnter = (itemName: string) => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
    setOpenDropdown(itemName);
  };

  const handleMouseLeave = () => {
    const timeout = setTimeout(() => {
      setOpenDropdown(null);
    }, 200);
    setCloseTimeout(timeout);
  };

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          isScrolled
            ? 'bg-[#030116]/95 backdrop-blur-md border-b border-white/10'
            : 'bg-[#030116]/60 backdrop-blur-sm'
        )}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center group">
              <img 
                src="/images/logo/logo_cropped.png" 
                alt="SGC Logo" 
                className="h-12 w-auto opacity-90 group-hover:opacity-100 transition-opacity"
              />
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => (
                <div
                  key={item.name}
                  className="relative"
                  onMouseEnter={() => item.submenu && handleMouseEnter(item.name)}
                  onMouseLeave={handleMouseLeave}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'px-4 py-2 text-sm font-medium transition-all duration-200 inline-flex items-center space-x-1',
                      pathname === item.href
                        ? 'text-white'
                        : 'text-white/80 hover:text-white'
                    )}
                  >
                    <span>{item.name}</span>
                    {item.submenu && <ChevronDown className="w-4 h-4" />}
                  </Link>

                  {/* Dropdown Menu */}
                  {item.submenu && openDropdown === item.name && (
                    <div 
                      className="absolute top-full left-0 mt-0 w-56 bg-[#030116]/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl py-2"
                      onMouseEnter={() => handleMouseEnter(item.name)}
                      onMouseLeave={handleMouseLeave}
                    >
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.name}
                          href={subItem.href}
                          className="block px-4 py-2 text-sm text-white/80 hover:text-white hover:bg-white/5 transition-colors"
                        >
                          {subItem.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Dashboard Link */}
            <div className="hidden lg:flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="px-5 py-2 text-sm font-medium text-white border border-white/20 rounded-md hover:bg-white/10 transition-all duration-200"
              >
                Dashboard
              </Link>
            </div>

            {/* Mobile Menu Button - only show on mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden text-white p-2 ml-auto"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-[#030116]/95 backdrop-blur-lg lg:hidden transition-opacity duration-300',
          isMobileMenuOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none'
        )}
      >
        <div className="flex flex-col items-start justify-center h-full space-y-6 px-8 mt-10">
          {navItems.map((item, index) => (
            <div key={item.name} className="w-full">
              {item.submenu ? (
                <>
                  <div className="text-2xl font-medium text-white/60 mb-2">
                    {item.name}
                  </div>
                  <div className="space-y-3 ml-4">
                    {item.submenu.map((subItem) => (
                      <Link
                        key={subItem.name}
                        href={subItem.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block text-xl text-white/80 hover:text-white transition-colors"
                      >
                        {subItem.name}
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <Link
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-2xl font-medium text-white/80 hover:text-white transition-colors"
                >
                  {item.name}
                </Link>
              )}
            </div>
          ))}
          <Link
            href="/dashboard"
            onClick={() => setIsMobileMenuOpen(false)}
            className="px-8 py-3 text-lg font-medium text-white border border-white/20 rounded-md hover:bg-white/10 transition-all duration-200"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </>
  );
}
