const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const User = require('../models/User');
const authenticateToken = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const { sendAccountConfirmationEmail } = require('../utils/email');

const router = express.Router();

async function generateUniqueDoctorReferralCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = `DOC-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const existing = await User.findOne({ where: { doctorReferralCode: code } });
    if (!existing) {
      return code;
    }
  }

  return `DOC-${uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase()}`;
}

function normalizeDoctorCode(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

async function ensureDoctorReferralCodes() {
  const doctorsWithoutCode = await User.findAll({
    where: {
      role: 'doctor',
      [Op.or]: [
        { doctorReferralCode: null },
        { doctorReferralCode: '' }
      ]
    }
  });

  if (!doctorsWithoutCode.length) {
    return;
  }

  for (const doctor of doctorsWithoutCode) {
    doctor.doctorReferralCode = await generateUniqueDoctorReferralCode();
    await doctor.save();
  }
}

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

    if (!user.isEmailVerified) {
      return res.status(403).json({
        error: 'Merci de confirmer votre adresse e-mail avant de vous connecter.'
      });
    }

    if (user.role === 'patient' && user.registrationStatus === 'pending') {
      return res.status(403).json({
        error: 'Votre inscription est en attente de validation par votre médecin.'
      });
    }

    if (user.role === 'patient' && user.registrationStatus === 'rejected') {
      return res.status(403).json({
        error: 'Votre inscription a été refusée par votre médecin. Contactez votre médecin pour plus d\'informations.'
      });
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
        doctorReferralCode: user.doctorReferralCode || null,
        treatingDoctorId: user.treatingDoctorId,
        registrationStatus: user.registrationStatus,
        approvedAt: user.approvedAt,
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
    const { email, password, firstName, lastName, dateOfBirth, phone, role, speciality, doctorCode } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Tous les champs obligatoires doivent être remplis' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'Un compte avec cet email existe déjà' });
    }

    const userRole = role === 'doctor' ? 'doctor' : 'patient';

    let doctor = null;
    if (userRole === 'patient') {
      if (!doctorCode) {
        return res.status(400).json({ error: 'Le code médecin est obligatoire pour créer un compte patient' });
      }

      await ensureDoctorReferralCodes();

      const normalizedInputCode = normalizeDoctorCode(doctorCode);
      if (!normalizedInputCode) {
        return res.status(400).json({ error: 'Code médecin invalide' });
      }

      const doctors = await User.findAll({
        where: { role: 'doctor' },
        attributes: ['id', 'doctorReferralCode', 'profile']
      });

      doctor = doctors.find((candidate) => {
        return normalizeDoctorCode(candidate.doctorReferralCode) === normalizedInputCode;
      }) || null;

      if (!doctor) {
        return res.status(400).json({ error: 'Code médecin invalide' });
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

    const confirmationToken = uuidv4();
    const newUser = await User.create({
      id: `${userRole}-${uuidv4()}`,
      email,
      password: hashedPassword,
      role: userRole,
      doctorReferralCode: userRole === 'doctor' ? await generateUniqueDoctorReferralCode() : null,
      treatingDoctorId: userRole === 'patient' ? doctor.id : null,
      registrationStatus: userRole === 'patient' ? 'pending' : 'approved',
      approvedAt: userRole === 'patient' ? null : new Date(),
      approvedByDoctorId: null,
      isEmailVerified: false,
      emailVerificationToken: confirmationToken,
      profile
    });

    const confirmationUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/api/auth/confirm/${confirmationToken}`;
    const mailResult = await sendAccountConfirmationEmail({
      firstName: firstName,
      lastName: lastName,
      email,
      confirmationUrl
    });

    if (userRole === 'patient') {
      return res.status(201).json({
        message: mailResult.success
          ? 'Compte créé avec succès. Un e-mail de confirmation a été envoyé.'
          : 'Compte créé avec succès. L’e-mail de confirmation n’a pas pu être envoyé, mais le compte est enregistré. Vous pouvez demander un nouveau mail plus tard.',
        registrationStatus: newUser.registrationStatus,
        emailVerificationRequired: true,
        emailSent: mailResult.success
      });
    }

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: mailResult.success
        ? 'Compte créé avec succès. Un e-mail de confirmation a été envoyé.'
        : 'Compte créé avec succès. L’e-mail de confirmation n’a pas pu être envoyé, mais le compte est enregistré.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        doctorReferralCode: newUser.doctorReferralCode || null,
        treatingDoctorId: newUser.treatingDoctorId,
        registrationStatus: newUser.registrationStatus,
        approvedAt: newUser.approvedAt,
        isEmailVerified: newUser.isEmailVerified,
        profile: newUser.profile || {}
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/auth/confirm/:token
router.get('/confirm/:token', async (req, res) => {
  try {
    const { token } = req.params;

    if (!token) {
      return res.status(400).json({ error: 'Token de confirmation manquant' });
    }

    const user = await User.findOne({ where: { emailVerificationToken: token } });
    if (!user) {
      return res.status(400).json({ error: 'Lien de confirmation invalide ou expiré' });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerifiedAt = new Date();
    await user.save();

    return res.status(200).json({
      message: 'Votre compte a bien été confirmé. Vous pouvez maintenant vous connecter.',
      email: user.email
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/doctor/referral-code
router.post('/doctor/referral-code', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Accès réservé aux médecins' });
    }

    const doctor = await User.findOne({
      where: {
        id: req.user.id,
        role: 'doctor'
      }
    });

    if (!doctor) {
      return res.status(404).json({ error: 'Médecin introuvable' });
    }

    doctor.doctorReferralCode = await generateUniqueDoctorReferralCode();
    await doctor.save();

    res.json({
      message: 'Code médecin généré avec succès.',
      doctorReferralCode: doctor.doctorReferralCode
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
      doctorReferralCode: user.doctorReferralCode || null,
      treatingDoctorId: user.treatingDoctorId,
      registrationStatus: user.registrationStatus,
      approvedAt: user.approvedAt,
      profile: user.profile || {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
