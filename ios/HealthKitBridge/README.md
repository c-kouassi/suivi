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

## Tester sur iPhone — avec le serveur en ligne (recommande)

L'application est deployee : aucune configuration reseau n'est necessaire,
l'iPhone peut meme etre en 4G/5G.

1. Dans l'application, saisir l'URL :

```text
https://suivi-production-caea.up.railway.app/api
```

2. Saisir les identifiants d'un patient confirme
   (par exemple `marc.petit@demo.fr` / `demo1234` apres `npm run seed`).
3. Appuyer sur `Synchroniser mes donnees`.
4. Accepter les permissions Apple Health.
5. Verifier les donnees dans le dashboard SuiviPatient.

## Tester contre le serveur local

A reserver au developpement : cette voie echoue souvent sur les reseaux
d'ecole ou d'entreprise.

1. Demarrer le backend sur le Mac :

```bash
cd /Users/chocobain/devs/hetic/suivipatient
npm run dev
```

Le demarrage affiche directement l'URL a coller dans l'application :

```text
📱 Reseau   : http://192.168.1.25:3000/api   ← a coller dans l'app iOS
```

2. Mettre l'iPhone et le Mac sur le meme Wi-Fi, puis synchroniser.

### Si la synchronisation expire (« the request timed out »)

- **Isolation client.** Les Wi-Fi d'ecole et d'entreprise empechent souvent
  deux appareils de se joindre. Le serveur est joignable depuis le Mac mais
  pas depuis l'iPhone. Utiliser un routeur personnel.
- **Le partage de connexion depuis l'iPhone ne marche pas dans ce sens.**
  iOS ne route pas le trafic du telephone hote vers un appareil connecte a son
  propre point d'acces. Il faut l'inverse : le Mac partage sa connexion.
- **Permission « Reseau local ».** Reglages → SuiviPatientHealthKit → activer
  « Reseau local ». Sans elle, iOS bloque silencieusement les connexions vers
  une IP locale, ce qui se manifeste par un simple timeout.
- **L'IP du Mac change** a chaque reseau : la relire au demarrage du serveur.

Le plus simple en demonstration reste l'URL de production ci-dessus, ou un
tunnel : `cloudflared tunnel --url http://localhost:3000`.

## Donnees synchronisees

Le pont lit les 7 derniers jours pour : frequence cardiaque, frequence cardiaque au repos, saturation O2, pas, energie active, poids, temperature corporelle et frequence respiratoire.

Le serveur dedoublonne les mesures avec l'identifiant HealthKit et peut creer une alerte si une valeur inhabituelle est recue.

Ne jamais publier un mot de passe dans l'application. Cette version utilise le mot de passe uniquement pour obtenir un JWT pendant le test. Une version production devra utiliser un refresh token ou un flux OAuth adapte.
