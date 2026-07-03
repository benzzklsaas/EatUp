import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "EatUp — Click & Collect pour restaurants",
    template: "%s | EatUp",
  },
  description: "EatUp permet aux restaurants de recevoir des commandes en ligne et de gérer leur click & collect en quelques minutes.",
  keywords: ["click and collect", "restaurant", "commande en ligne", "SaaS restaurant"],
  authors: [{ name: "EatUp" }],
  metadataBase: new URL("https://eat-up-sepia.vercel.app"),
  openGraph: {
    title: "EatUp — Click & Collect pour restaurants",
    description: "Lancez votre click & collect en 5 minutes. Menu en ligne, commandes, paiement, emails automatiques.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
