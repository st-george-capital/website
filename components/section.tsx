import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type SectionTone = 'white' | 'offwhite' | 'blue-grey' | 'navy';

interface SectionProps {
  children: ReactNode;
  className?: string;
  /** @deprecated use `tone="navy"` instead */
  dark?: boolean;
  tone?: SectionTone;
  id?: string;
}

const toneClasses: Record<SectionTone, string> = {
  white: 'bg-white text-black',
  offwhite: 'bg-surface-offwhite text-black',
  'blue-grey': 'bg-surface-blue-grey text-black',
  navy: 'bg-[#030116] text-white',
};

export function Section({ children, className, dark = false, tone, id }: SectionProps) {
  const resolvedTone = tone ?? (dark ? 'navy' : 'white');
  return (
    <section
      id={id}
      className={cn('content-section py-20 md:py-32', toneClasses[resolvedTone], className)}
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
    <div className={cn('section-header mb-16', centered && 'text-center mx-auto', className)}>
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

