import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Cruțănomie - Patriotism Economic",
  description:
    "Economie locală rezilientă: Mânzare, Strungă, Scofalută, Apa — P2P pentru România.",
  manifest: "/manifest.json",
  openGraph: {
   title: "Cruțănomia-RON - Patriotism Economic",
   description: "Economie locală rezilientă: Mânzare, Logistică, Scofaluță, Apă - P2P pentru România.",
   url: "https://xn--cruleula-17a31z.vercel.app/", // sau domeniul tău cu xn-- dacă vrei siguranță maximă
   siteName: "CruțăLeula",
   images: [
     {
       url: "/opengraph-image.jpg", // Calea către imaginea din folderul tău public (ex: public/og-image.png)
       width: 1200,
       height: 630,
       alt: "CruțăLeula Previzualizare",
     },
   ],
   locale: "ro_RO",
   type: "website",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CruțăLeul",
  },
  applicationName: "CruțăLeul",
};

export const viewport: Viewport = {
  themeColor: "#f4f4f5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ro">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh bg-zinc-100 text-zinc-900 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
