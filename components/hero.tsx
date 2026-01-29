'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface HeroProps {
  title: string | ReactNode;
  subtitle?: string;
  children?: ReactNode;
  height?: 'full' | 'large' | 'medium' | 'small';
  pattern?: boolean;
  breadcrumb?: string;
  align?: 'center' | 'left';
}

export function Hero({ title, subtitle, children, height = 'full', pattern = true, breadcrumb, align = 'center' }: HeroProps) {
  const heightClasses = {
    full: 'min-h-screen',
    large: 'min-h-[80vh]',
    medium: 'min-h-[60vh]',
    small: 'min-h-[40vh]',
  };

  return (
    <section className={`relative ${heightClasses[height]} flex items-center ${align === 'center' ? 'justify-center' : 'justify-start'} overflow-hidden bg-[#030116] pt-20`}>
      {/* Background Pattern */}
      {pattern && (
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                               linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
            }}
          />
        </div>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-blue-800/10" />

      {/* Content */}
      <div className={`relative z-10 w-full px-6 lg:px-8 ${align === 'center' ? 'max-w-7xl mx-auto text-center' : 'max-w-7xl text-left'}`}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          {breadcrumb && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-sm text-white/80 mb-4 uppercase tracking-widest font-light"
            >
              {breadcrumb}
            </motion.p>
          )}
          {typeof title === 'string' ? (
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              {title.split('\n').map((line, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  {line}
                </motion.div>
              ))}
            </h1>
          ) : (
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              {title}
            </h1>
          )}

          {subtitle && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className={`text-xl md:text-2xl text-white/70 mb-12 max-w-3xl leading-relaxed ${align === 'center' ? 'mx-auto' : ''}`}
            >
              {subtitle}
            </motion.p>
          )}

          {children && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              {children}
            </motion.div>
          )}
        </motion.div>

      </div>
    </section>
  );
}

