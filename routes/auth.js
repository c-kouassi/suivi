const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis' });
    }

    const user = await User.findOne({ where: { email } });

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
        treatingDoctorId: user.treatingDoctorId,
        profile: user.profile || {}
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, dateOfBirth, phone, role, speciality, treatingDoctorId } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Un compte avec cet email existe déjà' });
    }

    const userRole = role === 'doctor' ? 'doctor' : 'patient';

    let doctor = null;
    if (userRole === 'patient' && treatingDoctorId) {
      doctor = await User.findOne({
        where: { id: treatingDoctorId, role: 'doctor' }
      });

      if (!doctor) {
        return res.status(400).json({ error: 'Médecin référent introuvable' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = `${firstName[0]}${lastName[0]}`.toUpperCase();

    const baseProfile = {
      firstName,
      lastName,
      avatar,
      phone: phone || null
    };

    const profile = userRole === 'doctor'
      ? {
        ...baseProfile,
        speciality: speciality || null
      }
      : {
        ...baseProfile,
        dateOfBirth: dateOfBirth || null,
        address: null,
        hospitalDischargeDate: null,
        diagnosis: null,
        treatingDoctor: doctor
          ? `Dr. ${(doctor.profile && doctor.profile.firstName) || ''} ${(doctor.profile && doctor.profile.lastName) || ''}`.trim()
          : null,
        hospitalStay: null
      };

    const newUser = await User.create({
      id: `${userRole}-${uuidv4()}`,
      email,
      password: hashedPassword,
      role: userRole,
      treatingDoctorId: userRole === 'patient' ? (treatingDoctorId || null) : null,
      profile
    });

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
        treatingDoctorId: newUser.treatingDoctorId,
        profile: newUser.profile || {}
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      treatingDoctorId: user.treatingDoctorId,
      profile: user.profile || {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
