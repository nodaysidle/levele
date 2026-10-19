import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Levele — a design studio in your browser",
    template: "%s · Levele",
  },
  description:
    "Levele is an open-source, Canva-style design editor for the browser. Templates, layers, animation, comments, live collaboration and export to PNG, PDF, GIF or video.",
  applicationName: "Levele",
  keywords: ["design editor", "canva alternative", "open source", "graphic design", "templates"],
  authors: [{ name: "Levele contributors" }],
  openGraph: {
    title: "Levele — a design studio in your browser",
    description: "Open-source design for social, print and presentations. Free, local-first, collaborative.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Levele — design like you mean it.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Levele — a design studio in your browser",
    description: "Open-source design for social, print and presentations.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#17161A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Bebas+Neue&family=Caveat:wght@400..700&family=DM+Serif+Display:ital@0;1&family=Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900&family=Instrument+Serif:ital@0;1&family=Inter:wght@300..900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Lora:ital,wght@0,400..700;1,400..700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Poppins:wght@300;400;500;600;700;800&family=Space+Grotesk:wght@400..700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
