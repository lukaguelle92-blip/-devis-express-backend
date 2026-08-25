require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const stripeRoutes = require('./routes/stripe');
const webhookRoutes = require('./routes/webhook');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));

// ⚠️ Le webhook Stripe doit être monté AVANT express.json(),
// car il a besoin du corps brut de la requête pour vérifier la signature.
app.use('/api/webhook', webhookRoutes);

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/stripe', stripeRoutes);

app.get('/', (req, res) => {
  res.json({ status: 'Devis Express API en ligne ✅' });
});

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Devis Express backend démarré sur le port ${PORT}`);
});
