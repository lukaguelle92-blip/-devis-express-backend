const express = require('express');
const Stripe = require('stripe');
const db = require('../db');
const requireAuth = require('../middleware/authMiddleware');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/stripe/create-checkout-session
// Crée une session de paiement Stripe pour l'abonnement à 19€/mois
router.post('/create-checkout-session', requireAuth, async (req, res) => {
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    let customerId = user.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: String(user.id) }
      });
      customerId = customer.id;
      db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customerId, user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${process.env.FRONTEND_URL}/abonnement-succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/abonnement-annule`,
      metadata: { userId: String(user.id) }
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Erreur création session Stripe:', err.message);
    res.status(500).json({ error: 'Impossible de créer la session de paiement.' });
  }
});

// GET /api/stripe/me
// Renvoie le statut d'abonnement de l'utilisateur connecté
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, email, subscription_status, devis_count_month FROM users WHERE id = ?'
  ).get(req.userId);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
  res.json({ user });
});

module.exports = router;
