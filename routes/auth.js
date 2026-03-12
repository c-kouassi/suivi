const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB, saveDB } = require('../utils/db');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis' });
  }

  const db = getDB();
  const user = db.users.find(u => u.email === email);

  if (!user) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: 'Identifiants incorrects' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile
    }
  });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, firstName, lastName, dateOfBirth, phone } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
  }

  const db = getDB();
  const existingUser = db.users.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({ error: 'Un compte avec cet email existe déjà' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = {
    id: `patient-${uuidv4()}`,
    email,
    password: hashedPassword,
    role: 'patient',
    profile: {
      firstName,
      lastName,
      dateOfBirth: dateOfBirth || '',
      phone: phone || '',
      address: '',
      hospitalDischargeDate: '',
      diagnosis: '',
      treatingDoctor: '',
      hospitalStay: '',
      avatar: `${firstName[0]}${lastName[0]}`.toUpperCase()
    }
  };

  db.users.push(newUser);
  saveDB(db);

  const token = jwt.sign(
    { id: newUser.id, email: newUser.email, role: newUser.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
      profile: newUser.profile
    }
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Non authentifié' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Token invalide' });

    const db = getDB();
    const user = db.users.find(u => u.id === decoded.id);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      profile: user.profile
    });
  });
});

module.exports = router;
