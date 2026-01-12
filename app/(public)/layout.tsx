import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navigation />
      <main className="pt-20">
        {children}
      </main>
      <Footer />
    </>
  );
}

