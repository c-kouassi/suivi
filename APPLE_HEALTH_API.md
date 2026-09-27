# Integration Apple Health / Apple Watch

Un serveur web ne peut pas lire directement une Apple Watch. L'application iOS doit demander l'autorisation HealthKit, lire les mesures autorisées, puis appeler l'API SuiviPatient avec le JWT du patient.

## Endpoint

`POST /api/apple-health/sync`

Header :

```http
Authorization: Bearer <jwt_patient>
Content-Type: application/json
```

Corps :

```json
{
  "measurements": [
    {
      "externalId": "healthkit-uuid-1",
      "type": "heart_rate",
      "value": 72,
      "unit": "bpm",
      "measuredAt": "2026-09-05T08:30:00.000Z",
      "source": "Apple Watch",
      "metadata": { "device": "Apple Watch" }
    }
  ]
}
```

Types acceptés : `heart_rate`, `resting_heart_rate`, `oxygen_saturation`, `steps`, `active_energy`, `body_mass`, `body_temperature`, `respiratory_rate`, `blood_pressure_systolic`, `blood_pressure_diastolic`.

Chaque synchronisation crée un journal immuable avec un `syncId` et un `syncedAt`. Les valeurs sont conservées même si le même `externalId` revient lors d'une synchronisation suivante. Les lots sont limités à 1000 mesures. Les valeurs très inhabituelles créent une notification d'alerte dans le dossier du patient.

## Lecture

- `GET /api/apple-health/latest` : dernières mesures du patient connecté.
- `GET /api/apple-health/summary` : moyennes et dernières valeurs des 7 derniers jours.

L'application iOS doit synchroniser périodiquement uniquement les données autorisées par le patient. Elle ne doit jamais envoyer le mot de passe du patient, seulement son JWT obtenu par `/api/auth/login`.
