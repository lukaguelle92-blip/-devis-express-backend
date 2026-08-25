# Devis Express — Backend

API pour gérer les comptes utilisateurs et l'abonnement Stripe (19€/mois) de Devis Express.

## Ce que fait ce backend

- **Inscription / connexion** (`/api/auth/signup`, `/api/auth/login`) avec email + mot de passe, token JWT.
- **Paiement Stripe** (`/api/stripe/create-checkout-session`) : crée une session de paiement pour l'abonnement.
- **Webhook Stripe** (`/api/webhook/stripe`) : met à jour automatiquement le statut d'abonnement en base quand un paiement passe, échoue, ou qu'un abonnement est annulé.
- Base de données **SQLite** intégrée (pas de service séparé à payer).

---

## Étape 1 — Déployer sur Render

1. Mets ce dossier dans un repo GitHub (crée un repo, `git init`, `git add .`, `git commit`, push).
2. Va sur [render.com](https://render.com) et crée un compte (tu peux te connecter avec GitHub directement).
3. Clique sur **New +** → **Web Service**.
4. Connecte ton repo GitHub `devis-express-backend`.
5. Configure :
   - **Name** : `devis-express-api` (ou ce que tu veux)
   - **Region** : Frankfurt (le plus proche de la France)
   - **Branch** : `main`
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
   - **Instance Type** : Free (pour démarrer)
6. Ajoute un **disque persistant** (pour que la base SQLite ne soit pas effacée à chaque redéploiement) :
   - Section **Disks** → **Add Disk**
   - Mount Path : `/data`
   - Size : 1 Go suffit largement pour démarrer
7. Dans **Environment Variables**, ajoute toutes les variables du fichier `.env.example` :
   - `JWT_SECRET` → génère une chaîne aléatoire longue (ex: via un générateur de mot de passe)
   - `STRIPE_SECRET_KEY` → ta clé secrète Stripe (mode test pour l'instant, dans Stripe Dashboard → Developers → API keys)
   - `STRIPE_PRICE_ID` → `price_1U87CZ3AHFCLMJ7JNCqgc3w3` (déjà créé)
   - `STRIPE_WEBHOOK_SECRET` → on le récupère à l'étape 2 ci-dessous
   - `FRONTEND_URL` → `https://coruscating-chebakia-fb387a.netlify.app`
   - `DB_PATH` → `/data/devis-express.db`
8. Clique sur **Create Web Service**. Render va installer les dépendances et démarrer le serveur.
9. Une fois déployé, tu auras une URL du type `https://devis-express-api.onrender.com`.

---

## Étape 2 — Connecter le webhook Stripe

1. Va sur [dashboard.stripe.com](https://dashboard.stripe.com) → **Developers** → **Webhooks**.
2. Clique sur **Add endpoint**.
3. **Endpoint URL** : `https://devis-express-api.onrender.com/api/webhook/stripe` (remplace par ton URL Render réelle).
4. Sélectionne ces événements :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Clique sur **Add endpoint**.
6. Stripe te donne un **Signing secret** (commence par `whsec_...`). Copie-le.
7. Retourne sur Render → ton service → **Environment** → ajoute/modifie `STRIPE_WEBHOOK_SECRET` avec cette valeur.
8. Render redéploie automatiquement avec la nouvelle variable.

---

## Étape 3 — Tester

Une fois déployé, teste avec ces requêtes (ou directement depuis ton frontend) :

```bash
# Créer un compte
curl -X POST https://devis-express-api.onrender.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"motdepasse123"}'

# Se connecter
curl -X POST https://devis-express-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"motdepasse123"}'

# Créer une session de paiement (avec le token reçu ci-dessus)
curl -X POST https://devis-express-api.onrender.com/api/stripe/create-checkout-session \
  -H "Authorization: Bearer TON_TOKEN_ICI"
```

La dernière requête renvoie une `url` : c'est la page de paiement Stripe à ouvrir dans le navigateur. Utilise une [carte de test Stripe](https://docs.stripe.com/testing) comme `4242 4242 4242 4242` pour simuler un paiement.

---

## Prochaine étape après ça

Une fois le backend en ligne et le webhook connecté, il restera à connecter ta **landing page Netlify** à cette API (formulaires d'inscription/connexion + bouton "S'abonner" qui appelle `create-checkout-session`).
