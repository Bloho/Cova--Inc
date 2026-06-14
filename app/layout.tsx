import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cova",
  description: "Watch, review, and share films with your people.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://cova.quest")
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
