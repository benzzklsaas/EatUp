import type { Metadata } from "next";
import { Bricolage_Grotesque, Instrument_Sans, DM_Mono } from "next/font/google";

/**
 * Le système typographique de la vitrine : un display qui a du caractère,
 * une sans très lisible, une mono pour les prix et les horaires. Chargé ici
 * et pas à la racine, pour que le reste de l'application n'en paie pas le coût.
 */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

/**
 * La vitrine porte le nom du restaurant, pas celui de la plateforme :
 * « absolute » neutralise le gabarit « %s | EatUp » de la racine.
 */
export const metadata: Metadata = {
  title: { absolute: "Crousty Naan — Naans garnis à emporter" },
  description:
    "Crousty Naan : des naans garnis, préparés sur place et à emporter. Découvrez la carte, les horaires et commandez en ligne.",
  openGraph: {
    title: "Crousty Naan — Naans garnis à emporter",
    description:
      "Des naans garnis, préparés sur place et à emporter. Découvrez la carte et commandez en ligne.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function CroustyNaanLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${bricolage.variable} ${instrument.variable} ${dmMono.variable}`}
      style={{ display: "flex", flexDirection: "column", flex: 1 }}
    >
      {children}
    </div>
  );
}
