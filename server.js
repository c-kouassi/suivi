require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const initializeDatabase = require('./config/init');

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const medicationRoutes = require('./routes/medications');
const symptomRoutes = require('./routes/symptoms');
const thyroidCheckinRoutes = require('./routes/thyroidCheckins');
const appleHealthRoutes = require('./routes/appleHealth');
const chatRoutes = require('./routes/chat');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');
const documentRoutes = require('./routes/documents');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * CORS restreint.
 *
 * Le front est servi par ce même serveur : il est donc en same-origin et n'a
 * besoin d'aucune autorisation. On garde une liste blanche pour l'URL publique
 * et le développement local.
 *
 * Les requêtes sans en-tête `Origin` sont acceptées : c'est le cas du
 * compagnon iOS (URLSession n'est pas soumis au CORS, qui est un mécanisme de
 * navigateur) et des appels serveur à serveur. Les bloquer casserait la
 * synchronisation Apple Health sans rien apporter en sécurité.
 */
const allowedOrigins = [
  process.env.APP_BASE_URL,
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`
].filter(Boolean);

app.use(cors((req, callback) => {
  const origin = req.headers.origin;
  const host = req.get('host');

  // Le front est servi par ce serveur : on autorise toujours sa propre origine,
  // déduite de l'en-tête Host. Sans cela, un APP_BASE_URL absent ou mal
  // orthographié ferait échouer en 403 tous les appels du navigateur — les
  // requêtes same-origin portent elles aussi un en-tête Origin.
  const isSelf = origin === `https://${host}` || origin === `http://${host}`;

  if (!origin || isSelf || allowedOrigins.includes(origin)) {
    return callback(null, { origin: true, credentials: true });
  }
  callback(new Error(`Origine non autorisée : ${origin}`));
}));

// Les lots Apple Health contiennent de nombreuses mesures et metadonnees.
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/thyroid-checkins', thyroidCheckinRoutes.router);
app.use('/api/apple-health', appleHealthRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/messages', messageRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Route API introuvable : ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Lot de données trop volumineux. Réduisez le nombre de mesures envoyées.'
    });
  }
  // Origine refusée par la liste blanche CORS : 403 explicite plutôt qu'un 500.
  if (err.message && err.message.startsWith('Origine non autorisée')) {
    return res.status(403).json({ error: err.message });
  }
  return next(err);
});

// Serve frontend pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/auth', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'public', 'chat.html')));
app.get('/symptoms', (req, res) => res.sendFile(path.join(__dirname, 'public', 'symptoms.html')));
app.get('/medications', (req, res) => res.sendFile(path.join(__dirname, 'public', 'medications.html')));
app.get('/appointments', (req, res) => res.sendFile(path.join(__dirname, 'public', 'appointments.html')));
app.get('/documents', (req, res) => res.sendFile(path.join(__dirname, 'public', 'documents.html')));
app.get('/messages', (req, res) => res.sendFile(path.join(__dirname, 'public', 'messages.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));

// Adresses IPv4 locales (pour configurer l'app iOS sur le même réseau).
function lanAddresses() {
  const nets = require('os').networkInterfaces();
  const out = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) out.push(net.address);
    }
  }
  return out;
}

// Initialiser la base de données puis démarrer le serveur
initializeDatabase().then(() => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🏥 SuiviPatient - Application démarrée`);
    console.log(`📡 Local    : http://localhost:${PORT}`);
    for (const ip of lanAddresses()) {
      console.log(`📱 Réseau   : http://${ip}:${PORT}/api   ← à coller dans l'app iOS`);
    }
    console.log(`\n📋 Identifiants de test :`);
    console.log(`   Patient : jean.dupont@email.com / password`);
    console.log(`   Médecin : sophie.martin@hopital.fr / password\n`);
  });
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n❌ Le port ${PORT} est déjà utilisé — un autre serveur tourne déjà.`);
      console.error(`   Ferme-le puis relance :  lsof -nP -iTCP:${PORT} -sTCP:LISTEN   puis   kill <PID>\n`);
    } else {
      console.error('Erreur serveur :', err.message);
    }
    process.exit(1);
  });
}).catch(err => {
  console.error('Impossible de démarrer le serveur:', err.message);
  process.exit(1);
});
