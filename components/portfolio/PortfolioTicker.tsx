'use client';

import { useEffect, useState, useRef } from 'react';

interface PortfolioData {
  totalValue: number;
  dailyChange: number;
  dailyChangePercent: number;
}

function useAnimatedNumber(target: number, duration = 1500) {
  const [value, setValue] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === 0) return;
    const start = prevTarget.current;
    prevTarget.current = target;
    let startTime: number;
    let frame: number;

    const animate = (ts: number) => {
      if (!startTime) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + (target - start) * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

export function PortfolioTicker() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const animatedValue = useAnimatedNumber(data?.totalValue ?? 0);

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/portfolio/public-summary');
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) setData(json);
      } catch {
        // Silently fail on public page
      }
    };

    fetchData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!data) {
    return (
      <div className="flex flex-col items-center">
        <div className="text-5xl md:text-6xl font-bold text-white mb-2">—</div>
        <div className="text-white/60 text-lg">Portfolio Value</div>
      </div>
    );
  }

  const isPositive = data.dailyChange >= 0;
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(animatedValue);

  const formattedChange = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    signDisplay: 'always',
  }).format(data.dailyChange);

  const formattedPercent = `${isPositive ? '+' : ''}${data.dailyChangePercent.toFixed(2)}%`;

  return (
    <div className="flex flex-col items-center">
      <div className="text-5xl md:text-6xl font-bold text-white mb-2">
        {formattedValue}
      </div>
      <div className="text-white/60 text-lg">Portfolio Value</div>
      <div className={`text-sm mt-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {formattedChange} ({formattedPercent})
      </div>
    </div>
  );
}
