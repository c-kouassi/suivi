const express = require('express');
const authenticateToken = require('../middleware/auth');
const ChatMessage = require('../models/ChatMessage');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

// Base de connaissances IA post-hospitalisation
const AI_KNOWLEDGE_BASE = [
  {
    keywords: ['douleur', 'mal', 'douleurs', 'souffre', 'cicatrice'],
    response: `**Douleurs post-opératoires** 💊

Il est normal de ressentir des douleurs après une intervention chirurgicale, notamment au niveau de la cicatrice. Voici quelques conseils :

- Les douleurs légères à modérées (1-3/10) sont habituelles pendant les premières semaines
- Prenez votre traitement antidouleur prescrit aux heures indiquées
- Évitez les mouvements brusques et portez les vêtements amples
- Appliquez une légère pression avec un coussin lors de la toux

⚠️ **Consultez immédiatement** si vous ressentez une douleur thoracique intense, une douleur irradiant dans le bras gauche ou une difficulté respiratoire soudaine.`
  },
  {
    keywords: ['médicament', 'medicament', 'pilule', 'comprimé', 'traitement', 'oubli', 'dose'],
    response: `**Gestion de vos médicaments** 💊

Vos médicaments post-opératoires sont essentiels à votre rétablissement :

- Prenez-les exactement comme prescrit par votre médecin
- Ne modifiez jamais la dose sans avis médical
- En cas d'oubli : prenez le médicament dès que possible, sauf si l'heure suivante approche
- Consultez l'onglet **Médicaments** pour voir votre planning complet

🔔 Activez les rappels dans l'application pour ne jamais oublier une prise.

Vous avez des questions sur un médicament spécifique ?`
  },
  {
    keywords: ['rendez-vous', 'consultation', 'médecin', 'docteur', 'appointment'],
    response: `**Vos prochains rendez-vous** 📅

Un suivi médical régulier est crucial après votre hospitalisation :

- Votre prochaine consultation cardiologique est programmée le **18 mars à 14h30**
- N'oubliez pas de faire votre **bilan sanguin** avant ce rendez-vous
- En cas d'urgence, contactez le **15 (SAMU)** ou rendez-vous aux urgences

📋 Consultez l'onglet **Rendez-vous** pour voir et gérer tous vos rendez-vous.`
  },
  {
    keywords: ['fatigue', 'épuisé', 'fatigué', 'énergie', 'repos', 'sommeil'],
    response: `**Gestion de la fatigue** 😴

La fatigue est très normale après une opération cardiaque. Voici comment la gérer :

- **Respectez vos périodes de repos** : dormez 8h par nuit minimum
- **Activité progressive** : commencez par de courtes marches (5-10 min)
- **Évitez les efforts** : pas de port de charges lourdes pendant 6 semaines
- **Hydratation** : buvez au moins 1,5L d'eau par jour

📈 Votre énergie reviendra progressivement. La plupart des patients retrouvent une bonne forme après 4-6 semaines.

En cas de fatigue extrême ou soudaine, contactez votre médecin.`
  },
  {
    keywords: ['alimentation', 'régime', 'manger', 'nourriture', 'repas', 'sel', 'alcool'],
    response: `**Alimentation post-cardiaque** 🥗

Une bonne alimentation accélère votre rétablissement :

- **Réduisez le sel** : moins de 5g/jour (évitez les plats préparés)
- **Limitez les graisses saturées** : évitez les fritures, charcuteries, fromages gras
- **Mangez des oméga-3** : poissons gras (saumon, maquereau) 2x/semaine
- **Fruits et légumes** : minimum 5 portions par jour
- **Alcool** : abstinence totale pendant la convalescence

🍊 Préférez les cuissons à la vapeur ou au four. Un suivi avec un nutritionniste peut être bénéfique.`
  },
  {
    keywords: ['sport', 'activité physique', 'exercice', 'marche', 'rééducation', 'kiné'],
    response: `**Reprise de l'activité physique** 🚶

La rééducation cardiaque est une étape clé de votre rétablissement :

**Phase 1 (semaines 1-2) :**
- Marche légère 5-10 minutes, 2-3 fois/jour
- Exercices respiratoires

**Phase 2 (semaines 3-4) :**
- Marche 15-20 minutes
- Montée progressive des escaliers

**Phase 3 (semaines 5-8) :**
- Marche 30 minutes
- Programme de rééducation cardiaque avec kiné

⚠️ Arrêtez et appelez votre médecin si vous ressentez : essoufflement important, douleur thoracique, palpitations, malaise.`
  },
  {
    keywords: ['cicatrice', 'plaie', 'wound', 'infection', 'rouge', 'gonflé', 'pus'],
    response: `**Soins de la cicatrice** 🩹

Voici comment prendre soin de votre cicatrice :

**Signes normaux :**
- Légère rougeur, tiraillement, démangeaisons
- Petit hématome ou ecchymose

**Nettoyage :**
- Nettoyez doucement à l'eau tiède et savon doux
- Séchez en tamponnant (ne pas frotter)
- Évitez bains prolongés et piscine pendant 4 semaines

⚠️ **Consultez rapidement** si vous observez :
- Rougeur s'étendant, chaleur excessive
- Écoulement jaune/vert (pus)
- Fièvre > 38.5°C
- Ouverture de la plaie`
  },
  {
    keywords: ['coeur', 'palpitation', 'rythme', 'cardiaque', 'tachycardie', 'bradycardie'],
    response: `**Suivi cardiaque** ❤️

Votre cœur est en phase de guérison après l'intervention :

**Ce qui est normal :**
- Légères variations du rythme cardiaque
- Sensation de battements plus forts qu'avant

**Surveillez ces signes d'alerte :**
- Palpitations rapides (> 100 bpm au repos)
- Palpitations irrégulières persistantes
- Essoufflement au repos
- Syncope ou pré-syncope

📊 Enregistrez votre fréquence cardiaque quotidiennement dans la section **Suivi symptômes**.

🆘 Appelez le **15** immédiatement si vous ressentez une douleur thoracique intense avec essoufflement.`
  },
  {
    keywords: ['anxieux', 'anxiété', 'déprimé', 'triste', 'moral', 'peur', 'stress', 'psychologique'],
    response: `**Soutien psychologique** 🧠

Il est tout à fait normal de ressentir anxiété ou tristesse après une opération cardiaque. Vous n'êtes pas seul :

**Ce que vous pouvez ressentir :**
- Anxiété face à l'avenir
- Peur d'une rechute
- Dépression légère post-opératoire (touche 30% des patients)

**Comment vous aider :**
- Parlez-en à votre médecin sans hésiter
- Votre rendez-vous avec Dr. Anne Petit (psychiatrie) le 25 mars peut vous apporter un soutien
- Rejoignez un groupe de soutien pour cardiaques
- Pratiquez des techniques de relaxation (respiration abdominale)

💪 Votre santé mentale est aussi importante que votre santé physique.`
  },
  {
    keywords: ['urgence', 'appel', 'samu', 'pompiers', 'aide', 'urgences'],
    response: `**Numéros d'urgence** 🆘

En cas d'urgence médicale, n'hésitez pas à appeler :

- 🚨 **15** - SAMU (urgences médicales)
- 🚒 **18** - Pompiers
- 🆘 **112** - Numéro d'urgence européen

**Symptômes nécessitant une intervention immédiate :**
- Douleur thoracique intense
- Difficultés respiratoires soudaines
- Perte de connaissance
- Paralysie d'un côté du corps
- Troubles de la parole

**Contacts médicaux :**
- Dr. Sophie Martin : 01 23 45 67 89
- CHU Paris Nord (urgences cardiologiques) : disponible 24h/24`
  },
  {
    keywords: ['bonjour', 'bonsoir', 'salut', 'hello', 'comment', 'ça va'],
    response: `Bonjour ! Je suis votre assistant IA de suivi post-hospitalisation. 😊

Je suis là pour vous aider dans votre convalescence après votre **pontage coronarien**.

Je peux vous renseigner sur :
- 💊 Vos médicaments et leur prise
- 🏃 La reprise progressive des activités
- 🍽️ L'alimentation adaptée
- 🩹 Les soins de la cicatrice
- ❤️ Le suivi cardiaque
- 📅 Vos rendez-vous médicaux
- 🧠 Le soutien psychologique

Comment puis-je vous aider aujourd'hui ?`
  }
];

// Base de connaissances IA pour médecin
const AI_DOCTOR_KNOWLEDGE_BASE = [
  {
    keywords: ['patient', 'dossier', 'suivi', 'panel'],
    response: `**Suivi de vos patients** 🧑‍⚕️

Depuis votre dashboard médecin, vous pouvez :

- Consulter l'onglet **Mes patients**
- Ouvrir un dossier patient pour voir constantes, traitements et documents
- Envoyer des notifications ciblées
- Créer un rendez-vous pour un patient

💡 Commencez par sélectionner un patient pour afficher sa vue médicale détaillée.`
  },
  {
    keywords: ['notification', 'message', 'alerte'],
    response: `**Communication médecin-patient** 🔔

Vous pouvez interagir directement avec le patient depuis le dashboard :

- **Envoyer notification** pour rappel, consigne ou alerte
- Type recommandé : 
  - \'message\' pour information générale
  - \'alert\' pour information prioritaire

✍️ Rédigez des consignes courtes, claires et actionnables.`
  },
  {
    keywords: ['rendez-vous', 'appointment', 'consultation'],
    response: `**Planification des rendez-vous** 📅

Pour planifier un patient :

1. Ouvrez son dossier
2. Cliquez sur **Ajouter rendez-vous**
3. Renseignez titre, date, heure et lieu

Le rendez-vous sera visible dans son espace patient.`
  },
  {
    keywords: ['bonjour', 'salut', 'hello', 'bonsoir'],
    response: `Bonjour Docteur. 👋

Je suis votre assistant IA clinique dans SuiviPatient.

Je peux vous aider à :
- structurer le suivi patient,
- rédiger des notifications,
- préparer des rappels de consultation,
- standardiser vos messages d'éducation thérapeutique.

Que souhaitez-vous faire ?`
  }
];

function generateAIResponse(userMessage, userRole) {
  const message = userMessage.toLowerCase();

  if (userRole === 'doctor') {
    for (const entry of AI_DOCTOR_KNOWLEDGE_BASE) {
      if (entry.keywords.some(keyword => message.includes(keyword))) {
        return entry.response;
      }
    }

    return `Message reçu Docteur. ✅

Je peux vous assister sur :
- le suivi des dossiers patients,
- la préparation de notifications claires,
- l'organisation des consultations,
- les messages d'éducation post-hospitalisation.

Exemple : "Rédige une notification courte pour rappeler le bilan sanguin de demain."`;
  }

  for (const entry of AI_KNOWLEDGE_BASE) {
    if (entry.keywords.some(keyword => message.includes(keyword))) {
      return entry.response;
    }
  }

  return `Merci pour votre message. Je comprends votre préoccupation concernant votre rétablissement.

Pour des questions spécifiques à votre état de santé, je vous recommande de :

1. **Contacter votre médecin traitant** - Dr. Sophie Martin : 01 23 45 67 89
2. **Utiliser la messagerie** de l'application pour envoyer un message à votre équipe médicale
3. **Consulter les urgences** si vous ressentez des symptômes alarmants (appel 15)

Je peux vous aider sur des sujets comme :
- Vos médicaments, votre alimentation, votre activité physique
- Les soins de cicatrice, la gestion de la fatigue
- Vos rendez-vous médicaux

Reformulez votre question et je ferai de mon mieux pour vous aider ! 😊`;
}

function buildSystemPrompt(userRole) {
  if (userRole === 'doctor') {
    return `Tu es un assistant clinique pour médecins dans une application de suivi patient post-hospitalisation.
Réponds en français, de manière concise, structurée et actionnable.
Tu ne poses pas de diagnostic définitif.
Si une urgence est suspectée, rappelle d'appeler le 15.
Propose des étapes concrètes (suivi, communication patient, rendez-vous, coordination).`;
  }

  return `Tu es un assistant de suivi post-hospitalisation pour patient.
Réponds en français, de manière claire, rassurante et pratique.
Tu ne remplaces pas un médecin et tu ne poses pas de diagnostic définitif.
Si des signes d'urgence sont décrits, demande d'appeler immédiatement le 15.
Donne des conseils simples et des prochaines étapes concrètes.`;
}

function mapHistoryToLLMMessages(history) {
  return history
    .slice()
    .reverse()
    .map((item) => ({
      role: item.type === 'user' ? 'user' : 'assistant',
      content: item.message || ''
    }))
    .filter((m) => m.content.trim().length > 0);
}

async function generateGroqResponse({ userRole, history }) {
  if (!process.env.GROQ_API_KEY) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.35,
        max_tokens: 700,
        messages: [
          {
            role: 'system',
            content: buildSystemPrompt(userRole)
          },
          ...mapHistoryToLLMMessages(history)
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Groq API error:', response.status, errText.slice(0, 300));
      return null;
    }

    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content;
    return answer && answer.trim() ? answer.trim() : null;
  } catch (err) {
    console.error('Groq request failed:', err.message);
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// GET /api/chat
router.get('/', authenticateToken, async (req, res) => {
  try {
    const messages = await ChatMessage.findAll({
      where: { patientId: req.user.id },
      order: [['createdAt', 'ASC']]
    });
    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/chat/send
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Le message ne peut pas être vide' });
    }

    // Message utilisateur
    const userMessage = await ChatMessage.create({
      id: `msg-${uuidv4()}`,
      patientId: req.user.id,
      type: 'user',
      message: content.trim(),
      timestamp: new Date()
    });

    // Historique récent pour contextualiser la réponse LLM
    const history = await ChatMessage.findAll({
      where: { patientId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 12
    });

    const llmText = await generateGroqResponse({
      userRole: req.user.role,
      history
    });

    // Réponse IA
    const aiResponse = await ChatMessage.create({
      id: `msg-${uuidv4()}`,
      patientId: req.user.id,
      type: 'ai',
      message: llmText || generateAIResponse(content, req.user.role),
      timestamp: new Date()
    });

    res.json({ userMessage, aiResponse });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/chat/clear
router.delete('/clear', authenticateToken, async (req, res) => {
  try {
    await ChatMessage.destroy({
      where: { patientId: req.user.id }
    });
    res.json({ message: 'Historique effacé' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
