# Pont iPhone HealthKit -> SuiviPatient

Ce dossier contient le code SwiftUI du petit compagnon iPhone qui lit les donnees autorisees dans Apple Health et les envoie a l'API SuiviPatient.

## Creer le projet Xcode

1. Ouvrir Xcode.
2. `File > New > Project > iOS > App`.
3. Nom : `SuiviPatientHealthKit`.
4. Interface : `SwiftUI`.
5. Language : `Swift`.
6. Deployment target : iOS 16 ou plus.
7. Remplacer les fichiers Swift generes par les trois fichiers Swift de ce dossier.
8. Ajouter `Info.plist` au projet.
9. Dans `Signing & Capabilities`, ajouter la capability `HealthKit`.
10. Selectionner `SuiviPatientHealthKit.entitlements` dans les entitlements du target.
11. Choisir une equipe Apple Developer dans `Signing & Capabilities`.

HealthKit demande une capability Apple et ne fonctionnera pas dans le simulateur pour lire une Apple Watch reelle.

## Tester sur iPhone

1. Demarrer le backend sur le Mac :

```bash
cd /Users/chocobain/devs/hetic/suivipatient
npm start
```

2. Trouver l'adresse IP locale du Mac :

```bash
ipconfig getifaddr en0
```

3. Dans l'application, remplacer l'URL par :

```text
http://ADRESSE_IP_DU_MAC:3000/api
```

Exemple : `http://192.168.1.25:3000/api`.

4. Mettre l'iPhone et le Mac sur le meme Wi-Fi.
5. Saisir les identifiants d'un patient confirme.
6. Appuyer sur `Synchroniser mes donnees`.
7. Accepter les permissions Apple Health.
8. Verifier les donnees dans le dashboard SuiviPatient.

## Donnees synchronisees

Le pont lit les 7 derniers jours pour : frequence cardiaque, frequence cardiaque au repos, saturation O2, pas, energie active, poids, temperature corporelle et frequence respiratoire.

Le serveur dedoublonne les mesures avec l'identifiant HealthKit et peut creer une alerte si une valeur inhabituelle est recue.

Ne jamais publier un mot de passe dans l'application. Cette version utilise le mot de passe uniquement pour obtenir un JWT pendant le test. Une version production devra utiliser un refresh token ou un flux OAuth adapte.
