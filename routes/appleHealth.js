const express = require('express');
const { Op } = require('sequelize');
const authenticateToken = require('../middleware/auth');
const AppleHealthMeasurement = require('../models/AppleHealthMeasurement');
const Notification = require('../models/Notification');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const HEALTH_TYPES = new Set([
  'heart_rate',
  'resting_heart_rate',
  'oxygen_saturation',
  'steps',
  'active_energy',
  'body_mass',
  'body_temperature',
  'respiratory_rate',
  'blood_glucose',
  'body_fat_percentage',
  'bmi',
  'vo2_max',
  'distance_walking_running',
  'flights_climbed',
  'walking_heart_rate_average',
  'blood_pressure_systolic',
  'blood_pressure_diastolic'
]);

const HEALTH_TYPE_UNITS = {
  heart_rate: 'bpm',
  resting_heart_rate: 'bpm',
  oxygen_saturation: '%',
  steps: 'count',
  active_energy: 'kcal',
  body_mass: 'kg',
  body_temperature: '°C',
  respiratory_rate: 'count/min',
  blood_glucose: 'g/dL',
  body_fat_percentage: '%',
  bmi: 'kg/m²',
  vo2_max: 'mL/kg/min',
  distance_walking_running: 'm',
  flights_climbed: 'count',
  walking_heart_rate_average: 'bpm',
  blood_pressure_systolic: 'mmHg',
  blood_pressure_diastolic: 'mmHg'
};

const MAX_BATCH_SIZE = 1000;

function normalizeMeasurement(item) {
  const value = Number(item.value);
  const measuredAt = new Date(item.measuredAt);
  if (!item.externalId || !HEALTH_TYPES.has(item.type) || !Number.isFinite(value) || Number.isNaN(measuredAt.getTime())) {
    return null;
  }

  return {
    externalId: String(item.externalId).slice(0, 255),
    type: item.type,
    value,
    unit: String(item.unit || '').slice(0, 50) || 'unknown',
    measuredAt,
    source: String(item.source || 'Apple Health').slice(0, 255),
    metadata: item.metadata && typeof item.metadata === 'object' ? item.metadata : {}
  };
}

function getAlerts(measurements) {
  const alerts = [];
  measurements.forEach((measurement) => {
    if (measurement.type === 'heart_rate' && (measurement.value < 45 || measurement.value > 130)) {
      alerts.push(`Fréquence cardiaque Apple Watch inhabituelle : ${measurement.value} ${measurement.unit}.`);
    }
    if (measurement.type === 'oxygen_saturation' && measurement.value < 92) {
      alerts.push(`Saturation en oxygène basse enregistrée : ${measurement.value} ${measurement.unit}.`);
    }
    if (measurement.type === 'body_temperature' && measurement.value >= 39) {
      alerts.push(`Température élevée enregistrée : ${measurement.value} ${measurement.unit}.`);
    }
  });
  return [...new Set(alerts)].slice(0, 5);
}

router.post('/sync', authenticateToken, async (req, res) => {
  try {
    if (!Array.isArray(req.body.measurements)) {
      return res.status(400).json({ error: 'Le champ measurements doit être un tableau.' });
    }
    if (req.body.measurements.length > MAX_BATCH_SIZE) {
      return res.status(413).json({ error: `Le lot ne doit pas dépasser ${MAX_BATCH_SIZE} mesures.` });
    }

    const measurements = req.body.measurements.map(normalizeMeasurement);
    const invalidCount = measurements.filter((measurement) => !measurement).length;
    const validMeasurements = measurements.filter(Boolean);
    if (!validMeasurements.length) {
      return res.status(400).json({ error: 'Aucune mesure Apple Health valide à synchroniser.' });
    }

    const syncId = `sync-${uuidv4()}`;
    const syncedAt = new Date();
    for (const measurement of validMeasurements) {
      await AppleHealthMeasurement.create({
        id: `apple-health-${uuidv4()}`,
        patientId: req.user.id,
        syncId,
        syncedAt,
        ...measurement
      });
    }

    const alertReasons = getAlerts(validMeasurements);
    if (alertReasons.length) {
      await Notification.create({
        id: `notif-${uuidv4()}`,
        patientId: req.user.id,
        type: 'alert',
        title: 'Données Apple Watch à surveiller',
        message: alertReasons.join(' '),
        read: false,
        timestamp: new Date()
      });
    }

    res.status(201).json({
      message: 'Données Apple Health synchronisées.',
      syncId,
      syncedAt,
      received: req.body.measurements.length,
      created: validMeasurements.length,
      updated: 0,
      invalidCount,
      alertCreated: alertReasons.length > 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur pendant la synchronisation Apple Health.' });
  }
});

router.get('/latest', authenticateToken, async (req, res) => {
  try {
    const measurements = await AppleHealthMeasurement.findAll({
      where: { patientId: req.user.id },
      order: [['measuredAt', 'DESC']],
      limit: 100
    });
    res.json(measurements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const measurements = await AppleHealthMeasurement.findAll({
      where: { patientId: req.user.id, measuredAt: { [Op.gte]: since } },
      order: [['measuredAt', 'DESC']]
    });
    const summary = {};
    for (const type of HEALTH_TYPES) {
      summary[type] = { count: 0, latest: null, average: null, unit: HEALTH_TYPE_UNITS[type] };
    }
    for (const measurement of measurements) {
      summary[measurement.type].count += 1;
      summary[measurement.type].average = (summary[measurement.type].average || 0) + measurement.value;
      if (!summary[measurement.type].latest) summary[measurement.type].latest = measurement;
    }
    Object.values(summary).forEach((item) => {
      item.average = item.count ? Number((item.average / item.count).toFixed(2)) : null;
    });
    res.json({ since, summary });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
