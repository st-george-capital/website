import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  children: ReactNode;
  className?: string;
  dark?: boolean;
  id?: string;
}

export function Section({ children, className, dark = false, id }: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        'py-20 md:py-32',
        dark ? 'bg-[#030116] text-white' : 'bg-white text-black',
        className
      )}
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {children}
      </div>
    </section>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  centered?: boolean;
  className?: string;
}

export function SectionHeader({ title, subtitle, centered = false, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-16', centered && 'text-center mx-auto', className)}>
      <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
        {title}
      </h2>
      {subtitle && (
        <p className={cn('text-lg md:text-xl max-w-3xl', centered && 'mx-auto')}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

