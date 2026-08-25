const express = require('express');
const Stripe = require('stripe');
const db = require('../db');

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/webhook/stripe
// IMPORTANT : cette route doit recevoir le body BRUT (pas du JSON parsé),
// car Stripe vérifie la signature sur le corps brut de la requête.
router.post('/stripe', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Signature webhook invalide:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.metadata && session.metadata.userId;
      if (userId) {
        db.prepare(
          'UPDATE users SET stripe_subscription_id = ?, subscription_status = ? WHERE id = ?'
        ).run(session.subscription, 'active', userId);
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const status = subscription.status;
      db.prepare(
        'UPDATE users SET subscription_status = ? WHERE stripe_subscription_id = ?'
      ).run(status, subscription.id);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      db.prepare(
        'UPDATE users SET subscription_status = ? WHERE stripe_subscription_id = ?'
      ).run('past_due', invoice.subscription);
      break;
    }

    default:
      break;
  }

  res.json({ received: true });
});

module.exports = router;
