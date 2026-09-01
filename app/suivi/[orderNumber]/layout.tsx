import { Anton, Fraunces, DM_Mono } from "next/font/google";

/**
 * Même système typographique que la carte — le suivi de commande fait partie
 * de la même expérience de marque.
 */
const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
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
      className={`${anton.variable} ${fraunces.variable} ${dmMono.variable}`}
      style={{ display: "flex", flexDirection: "column", flex: 1 }}
    >
      {children}
    </div>
  );
}
