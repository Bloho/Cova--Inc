import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { TopProgressBar } from "@/components/TopProgressBar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cova",
  description: "Watch, review, and share films with your people.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://cova.quest"),
  icons: {
    icon: "/assets/favicon.png"
  },
  openGraph: {
    images: [{
      url: "/assets/BANNER.jpg",
      width: 1200,
      height: 630,
      alt: "Cova - Watch, review, and share films"
    }]
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <TopProgressBar />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
