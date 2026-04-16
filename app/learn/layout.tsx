import { Navigation } from '@/components/navigation';

// Learn pages manage their own top-padding relative to the fixed nav (h-20 = 80px).
// We intentionally do NOT add pt-20 here because the lesson reader has its own
// sub-nav bar that needs precise stacking control.
export default function LearnLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      {children}
    </>
  );
}
