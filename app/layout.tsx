import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "St. George Capital | Canada's Premier Quantitative Student Group",
  description: "St. George Capital is a dynamic organization at the University of Toronto, dedicated to empowering future financial experts by merging traditional and quantitative finance.",
  keywords: ["finance", "quantitative", "trading", "research", "University of Toronto", "UofT", "student organization"],
  authors: [{ name: "St. George Capital" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://www.stgeorgecapital.ca",
    siteName: "St. George Capital",
    title: "St. George Capital | Canada's Premier Quantitative Student Group",
    description: "Empowering future financial experts through rigorous training and real-world experience.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "St. George Capital",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "St. George Capital",
    description: "Canada's Premier Quantitative Student Group",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

