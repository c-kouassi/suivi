const nodemailer = require('nodemailer');

function getMailerTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: Number(port) === 465,
    auth: {
      user,
      pass
    },
    // Sans ces délais, un serveur SMTP qui ne répond pas (Gmail filtre
    // fréquemment les IP d'hébergeurs) laisse la requête d'inscription
    // suspendue indéfiniment : le patient reste sur un formulaire qui tourne.
    // On échoue vite, et l'inscription aboutit quand même — l'e-mail n'est
    // pas bloquant.
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 12000
  });
}

function buildConfirmationEmail({ firstName, lastName, email, confirmationUrl }) {
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || 'Cher utilisateur';

  return {
    from: process.env.SMTP_FROM || 'SuiviPatient <no-reply@suivipatient.local>',
    to: email,
    subject: 'Confirmation de votre compte SuiviPatient',
    html: `
      <div style="font-family:Arial,sans-serif; color:#1f2937; line-height:1.6;">
        <h2 style="color:#1d4ed8;">Bienvenue ${fullName} 👋</h2>
        <p>Votre compte SuiviPatient a bien été créé.</p>
        <p>Pour confirmer votre inscription, cliquez sur le bouton ci-dessous :</p>
        <p>
          <a href="${confirmationUrl}" style="display:inline-block; background:#1d4ed8; color:#fff; padding:12px 20px; border-radius:8px; text-decoration:none; font-weight:bold;">
            Confirmer mon compte
          </a>
        </p>
        <p>Si le bouton ne fonctionne pas, utilisez ce lien :</p>
        <p><a href="${confirmationUrl}">${confirmationUrl}</a></p>
        <p>Merci de votre confiance.</p>
        <p>L'équipe SuiviPatient</p>
      </div>
    `,
    text: `Bienvenue ${fullName}.\n\nVotre compte SuiviPatient a bien été créé.\nConfirmez votre inscription ici : ${confirmationUrl}`
  };
}

async function sendAccountConfirmationEmail({ firstName, lastName, email, confirmationUrl }) {
  const transporter = getMailerTransport();

  if (!transporter) {
    return {
      success: false,
      reason: 'SMTP_NOT_CONFIGURED',
      message: 'E-mail non envoyé: variables SMTP manquantes.'
    };
  }

  const mailOptions = buildConfirmationEmail({ firstName, lastName, email, confirmationUrl });

  try {
    const info = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: info.messageId,
      message: 'E-mail de confirmation envoyé.'
    };
  } catch (error) {
    console.error('Erreur envoi email confirmation:', error);
    return {
      success: false,
      reason: 'SMTP_SEND_FAILED',
      message: 'Impossible d’envoyer l’e-mail de confirmation.'
    };
  }
}

module.exports = {
  buildConfirmationEmail,
  sendAccountConfirmationEmail,
  getMailerTransport
};
