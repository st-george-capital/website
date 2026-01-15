import Link from 'next/link';
import { Linkedin, Instagram, Mail, MapPin } from 'lucide-react';

const footerLinks = {
  company: [
    { name: 'Who We Are', href: '/' },
    { name: 'What We Do', href: '/quant-trading' },
    { name: 'The Team', href: '/team' },
    { name: 'Contact', href: '/contact' },
  ],
  divisions: [
    { name: 'Quant Trading', href: '/quant-trading' },
    { name: 'Quant Research', href: '/quant-research' },
    { name: 'Equity & Macro Research', href: '/equity-macro-research' },
  ],
  resources: [
    { name: 'Research Articles', href: '/research' },
    { name: 'Strategy & Research', href: '/strategy' },
    { name: 'The Fund', href: '/fund' },
    { name: 'Join Us', href: '/contact' },
  ],
  legal: [
    { name: 'Privacy Policy', href: '/privacy-policy' },
    { name: 'Terms of Use', href: '/terms-of-use' },
  ],
};

const socialLinks = [
  {
    name: 'LinkedIn',
    href: 'https://www.linkedin.com/company/101142532',
    icon: Linkedin,
  },
  {
    name: 'Instagram',
    href: 'https://www.instagram.com/st_george_capital',
    icon: Instagram,
  },
];

export function Footer() {
  return (
    <footer className="bg-[#030116] text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block mb-6">
              <img 
                src="/images/logo/logo_cropped.png" 
                alt="SGC Logo" 
                className="h-12 w-auto opacity-90 hover:opacity-100 transition-opacity"
              />
            </Link>
            <p className="text-white/60 text-sm leading-relaxed mb-6 max-w-sm">
              Canada's premier student-led quantitative and fundamental research organization at the University of Toronto.
              Empowering the next generation of market leaders.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <a
                href="mailto:outreach@stgeorgecapital.ca"
                className="flex items-center space-x-3 text-white/60 hover:text-white transition-colors group"
              >
                <Mail size={18} className="group-hover:text-primary transition-colors" />
                <span className="text-sm">outreach@stgeorgecapital.ca</span>
              </a>
              <div className="flex items-start space-x-3 text-white/60">
                <MapPin size={18} className="mt-0.5 flex-shrink-0" />
                <span className="text-sm">
                  27 King's College Circle<br />
                  Toronto, Ontario, Canada
                </span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-primary hover:bg-primary/10 transition-all duration-200"
                  aria-label={social.name}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              Company
            </h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              Divisions
            </h3>
            <ul className="space-y-3">
              {footerLinks.divisions.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">
              Resources
            </h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-sm text-white/40">
              © {new Date().getFullYear()} St. George Capital Educational Society. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="text-sm text-white/40 hover:text-white transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

