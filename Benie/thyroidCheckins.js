const express = require('express');
const authenticateToken = require('../middleware/auth');
const ThyroidCheckin = require('../models/ThyroidCheckin');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const CATEGORY_LABELS = {
  normal: 'Normal',
  surveillance: 'Surveillance',
  important: 'Important',
  urgent: 'Urgent'
};

function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function classifyCheckin({ answers, measurements }) {
  const reasons = [];
  let riskScore = 0;
  const heartRate = numberOrNull(measurements.heartRate);
  const temperature = numberOrNull(measurements.temperature);
  const tsh = numberOrNull(measurements.tsh);
  const freeT4 = numberOrNull(measurements.freeT4);
  const symptomSeverity = numberOrNull(answers.symptomSeverity) || 0;

  if (answers.chestPain || answers.breathlessness || answers.fainting || answers.confusion) {
    riskScore += 100;
    reasons.push('Un signe d’alerte immédiate a été déclaré.');
  }
  if (answers.severePalpitations) {
    riskScore += 60;
    reasons.push('Palpitations importantes ou persistantes.');
  }
  if (heartRate !== null && (heartRate < 50 || heartRate > 120)) {
    riskScore += 60;
    reasons.push(`Fréquence cardiaque hors zone de sécurité déclarée (${heartRate} bpm).`);
  }
  if (temperature !== null && (temperature >= 39 || temperature <= 35)) {
    riskScore += 45;
    reasons.push(`Température inhabituelle (${temperature} °C).`);
  }
  if (symptomSeverity >= 4) {
    riskScore += 35;
    reasons.push(`Intensité des symptômes évaluée à ${symptomSeverity}/5.`);
  } else if (symptomSeverity >= 3) {
    riskScore += 15;
    reasons.push(`Symptômes modérés (${symptomSeverity}/5).`);
  }

  // Repères indicatifs pour orienter le suivi, à confirmer avec le laboratoire et le médecin.
  if (tsh !== null && (tsh < 0.1 || tsh > 10)) {
    riskScore += 35;
    reasons.push(`TSH très éloignée du repère habituel (${tsh} mUI/L).`);
  } else if (tsh !== null && (tsh < 0.4 || tsh > 4)) {
    riskScore += 15;
    reasons.push(`TSH à surveiller (${tsh} mUI/L).`);
  }
  if (freeT4 !== null && (freeT4 < 0.6 || freeT4 > 2)) {
    riskScore += 30;
    reasons.push(`T4 libre hors du repère indicatif (${freeT4}).`);
  }

  let category = 'normal';
  if (riskScore >= 100) category = 'urgent';
  else if (riskScore >= 50) category = 'important';
  else if (riskScore >= 15) category = 'surveillance';

  if (!reasons.length) reasons.push('Aucun indicateur nécessitant une alerte automatique.');
  return { category, riskScore, reasons };
}

function validatePayload(body) {
  const answers = body.answers && typeof body.answers === 'object' ? body.answers : {};
  const measurements = body.measurements && typeof body.measurements === 'object' ? body.measurements : {};
  const normalizedMeasurements = {
    tsh: numberOrNull(measurements.tsh),
    freeT4: numberOrNull(measurements.freeT4),
    freeT3: numberOrNull(measurements.freeT3),
    heartRate: numberOrNull(measurements.heartRate),
    temperature: numberOrNull(measurements.temperature),
    weight: numberOrNull(measurements.weight)
  };

  if (Object.values(normalizedMeasurements).some((value) => value !== null && value < 0)) {
    return { error: 'Les constantes ne peuvent pas être négatives.' };
  }
  if (normalizedMeasurements.heartRate !== null && normalizedMeasurements.heartRate > 250) {
    return { error: 'La fréquence cardiaque saisie est invalide.' };
  }
  if (normalizedMeasurements.temperature !== null && (normalizedMeasurements.temperature < 30 || normalizedMeasurements.temperature > 45)) {
    return { error: 'La température saisie est invalide.' };
  }

  return { answers, measurements: normalizedMeasurements };
}

async function createDoctorAlert(patient, checkin) {
  if (!patient.treatingDoctorId || checkin.category === 'normal') return null;

  const label = CATEGORY_LABELS[checkin.category];
  return Notification.create({
    id: `notif-${uuidv4()}`,
    patientId: patient.id,
    type: 'alert',
    title: `Checking thyroïde : ${label}`,
    message: `Un checking patient nécessite votre attention. Score ${checkin.riskScore}. ${checkin.reasons.join(' ')}`,
    read: false,
    timestamp: new Date()
  });
}

router.get('/', authenticateToken, async (req, res) => {
  try {
    const checkins = await ThyroidCheckin.findAll({
      where: { patientId: req.user.id },
      order: [['checkedAt', 'DESC']],
      limit: 30
    });
    res.json(checkins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.get('/latest', authenticateToken, async (req, res) => {
  try {
    const checkin = await ThyroidCheckin.findOne({
      where: { patientId: req.user.id },
      order: [['checkedAt', 'DESC']]
    });
    res.json(checkin || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const payload = validatePayload(req.body);
    if (payload.error) return res.status(400).json({ error: payload.error });

    const classification = classifyCheckin(payload);
    const checkin = await ThyroidCheckin.create({
      id: `thyroid-${uuidv4()}`,
      patientId: req.user.id,
      checkedAt: new Date(),
      answers: payload.answers,
      measurements: payload.measurements,
      ...classification
    });

    const patient = await User.findByPk(req.user.id);
    await createDoctorAlert(patient, checkin);

    res.status(201).json({
      checkin,
      categoryLabel: CATEGORY_LABELS[checkin.category],
      doctorAlertCreated: Boolean(patient && patient.treatingDoctorId && checkin.category !== 'normal')
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = {
  router,
  classifyCheckin
};
