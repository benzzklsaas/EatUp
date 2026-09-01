import { Bricolage_Grotesque, Instrument_Sans, DM_Mono } from "next/font/google";

/**
 * Même système typographique que la carte — le suivi de commande fait partie
 * de la même expérience de marque.
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

export default function SuiviLayout({
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
