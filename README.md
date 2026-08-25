This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Programme de fidélité

Le programme de fidélité (carte tampon + points, configurable par restaurant) ajoute plusieurs
tables à la base Supabase (`customers`, `loyalty_programs`, `loyalty_accounts`,
`loyalty_transactions`, plus une colonne `customer_id` sur `orders`).

Avant de déployer cette fonctionnalité, exécutez une fois `supabase/loyalty_schema.sql` dans
l'éditeur SQL du dashboard Supabase (Dashboard → SQL Editor → New query → coller le contenu du
fichier → Run). Le script est idempotent, il peut être relancé sans risque.

Côté commerçant : `Dashboard → Fidélité` pour configurer le programme, `Dashboard → Clients` pour
créditer manuellement un client payé en caisse ou valider une récompense.
Côté client : `eatup-app.fr/restaurant/<slug>/fidelite` (connexion par lien magique envoyé par
email, aucun mot de passe).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
