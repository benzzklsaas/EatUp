# Notifications WhatsApp des nouvelles commandes

Dès qu'un client valide sa commande, chaque employé du restaurant reçoit un message WhatsApp privé
envoyé par l'API officielle de Meta (WhatsApp Cloud API). Aucun groupe : l'API officielle ne permet pas
d'écrire dans un groupe créé depuis un téléphone.

Exemple de message reçu :

```
Nouvelle commande EAT-7K2Q9X chez Croustys Naan.
Client : Camille M.
Retrait : aujourd’hui à 12:40
Articles : 2× Naan poulet (Sauce blanche, 🥤 Cola, 🍟 Frites) · 1× Tiramisu
Total : 31,50 €
Paiement : à régler sur place
Retrouvez-la dans le tableau de bord EatUp.
```

Le client n'apparaît que par son prénom et l'initiale de son nom : ni téléphone ni email.

Fonctionnement (`lib/eatup/server/whatsapp.ts`, appelé depuis `app/api/orders/route.ts`) :
- envoi après la réponse au client : la confirmation de commande n'attend jamais WhatsApp ;
- une panne ou un refus de Meta n'empêche jamais une commande ; l'erreur est journalisée sans donnée
  personnelle (`[orders] WhatsApp non envoyé EAT-… destinataire …78 HTTP 400, code Meta 132001`) ;
- une commande renvoyée deux fois (réseau coupé) ne déclenche pas de second message ;
- tant que les variables ci-dessous ne sont pas définies, rien n'est envoyé.

## 1. Mise en place chez Meta (une seule fois)

1. **Compte Meta Business** sur business.facebook.com, puis **vérification de l'entreprise**
   (Paramètres de l'entreprise → Centre de sécurité ; justificatifs : extrait Kbis / SIRET, adresse).
2. **Application** sur developers.facebook.com : « Créer une app » → type *Business* → ajouter le produit
   **WhatsApp**.
3. **Numéro de téléphone dédié** (WhatsApp Manager → Numéros de téléphone) : un numéro qui n'est pas déjà
   utilisé dans l'application WhatsApp. Choisir le nom d'affichage (ex. « EatUp » ou « Croustys Naan »),
   validé par Meta. Noter l'**ID du numéro de téléphone** (Phone number ID).
4. **Jeton permanent** : Paramètres de l'entreprise → Utilisateurs système → créer un utilisateur système
   (rôle Admin), lui assigner l'app et le compte WhatsApp, puis « Générer un jeton » avec les permissions
   `whatsapp_business_messaging` et `whatsapp_business_management`, expiration « Jamais ».
5. **Modèle de message** (WhatsApp Manager → Modèles de message → Créer) :
   - catégorie : **Utilitaire** ; nom : `nouvelle_commande_eatup` ; langue : **Français** ;
   - corps (copier tel quel) :

     ```
     Nouvelle commande {{1}} chez {{2}}.
     Client : {{3}}
     Retrait : {{4}}
     Articles : {{5}}
     Total : {{6}}
     Paiement : {{7}}
     Retrouvez-la dans le tableau de bord EatUp.
     ```

   - exemples demandés par Meta : `EAT-7K2Q9X`, `Croustys Naan`, `Camille M.`, `aujourd’hui à 12:40`,
     `2× Naan poulet (Sauce blanche) · 1× Tiramisu`, `31,50 €`, `à régler sur place`.
   - Attendre le statut « Approuvé ». Si Meta le classe en Marketing, contester ou reformuler sans
     vocabulaire promotionnel.
6. **Employés** : recueillir leur accord pour recevoir ces messages (exigence de Meta) et leur numéro
   WhatsApp au format international. Ils n'ont rien à installer de plus.

## 2. Variables d'environnement (Vercel → Settings → Environment Variables)

À définir **uniquement pour l'environnement Production** (sinon les déploiements de prévisualisation
préviendraient aussi l'équipe), puis redéployer.

| Variable | Exemple | Rôle |
|---|---|---|
| `WHATSAPP_ACCESS_TOKEN` | jeton de l'utilisateur système | authentification (secret) |
| `WHATSAPP_PHONE_NUMBER_ID` | `123456789012345` | numéro WhatsApp expéditeur |
| `WHATSAPP_ORDER_RECIPIENTS` | `{"crousty-naan": ["33612345678", "33698765432"]}` | employés à prévenir, par slug de restaurant |
| `WHATSAPP_ORDER_TEMPLATE` | `nouvelle_commande_eatup` | facultatif (valeur par défaut) |
| `WHATSAPP_TEMPLATE_LANG` | `fr` | facultatif (valeur par défaut) |
| `WHATSAPP_GRAPH_VERSION` | `v23.0` | facultatif ; à monter quand Meta retire cette version |

Un autre restaurant EatUp s'ajoute en complétant simplement `WHATSAPP_ORDER_RECIPIENTS` avec son slug.

## 3. Vérifier

Passer une vraie commande depuis la page publique, prévenir l'équipe qu'il s'agit d'un test, puis
l'annuler dans le tableau de bord. En cas de message absent, chercher `WhatsApp non envoyé` dans les
journaux Vercel : le code Meta indique la cause (132001 modèle introuvable ou non approuvé,
131030 numéro non autorisé en mode test, 190 jeton invalide…).

## 4. Coûts et limites

- Meta facture chaque message « Utilitaire » à l'unité selon le pays du destinataire (quelques centimes
  en France ; grille officielle : developers.facebook.com/docs/whatsapp/pricing). Une commande envoyée à
  3 employés = 3 messages.
- Les réponses des employés arrivent sur le numéro WhatsApp Business et ne sont pas traitées par EatUp.
- Le tableau de bord EatUp (sonnerie et notification) et l'email au restaurant restent actifs.
