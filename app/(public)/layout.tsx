import { PublicExperience } from '@/components/public-experience';
import { Navigation } from '@/components/navigation';
import { Footer } from '@/components/footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PublicExperience>
      <Navigation />
      <main id="main-content" className="pt-20">
        {children}
      </main>
      <Footer />
    </PublicExperience>
  );
}

