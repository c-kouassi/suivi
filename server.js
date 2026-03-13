require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const initializeDatabase = require('./config/init');

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const medicationRoutes = require('./routes/medications');
const symptomRoutes = require('./routes/symptoms');
const chatRoutes = require('./routes/chat');
const patientRoutes = require('./routes/patients');
const doctorRoutes = require('./routes/doctors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/symptoms', symptomRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/doctors', doctorRoutes);

// Serve frontend pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'home.html')));
app.get('/auth', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, 'public', 'chat.html')));
app.get('/symptoms', (req, res) => res.sendFile(path.join(__dirname, 'public', 'symptoms.html')));
app.get('/medications', (req, res) => res.sendFile(path.join(__dirname, 'public', 'medications.html')));
app.get('/appointments', (req, res) => res.sendFile(path.join(__dirname, 'public', 'appointments.html')));
app.get('/documents', (req, res) => res.sendFile(path.join(__dirname, 'public', 'documents.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));

// Initialiser la base de données puis démarrer le serveur
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🏥 SuiviPatient - Application démarrée`);
    console.log(`📡 Serveur en écoute sur http://localhost:${PORT}`);
    console.log(`\n📋 Identifiants de test :`);
    console.log(`   Patient : jean.dupont@email.com / password`);
    console.log(`   Médecin : sophie.martin@hopital.fr / password\n`);
  });
}).catch(err => {
  console.error('Impossible de démarrer le serveur:', err.message);
  process.exit(1);
});
