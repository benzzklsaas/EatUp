import { Bricolage_Grotesque, Instrument_Sans, DM_Mono } from "next/font/google";

/**
 * Le système typographique du parcours client : un display qui a du caractère,
 * une sans très lisible pour tout le texte, une mono pour ce qui s'aligne en
 * colonne (prix, horaires, numéros). Chargé ici plutôt qu'à la racine pour que
 * le back-office n'en paie pas le coût.
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

export default function RestaurantLayout({
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
