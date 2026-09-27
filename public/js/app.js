// =============================================
// SuiviPatient - Utilitaires globaux
// =============================================

const API_BASE = '/api';

// =============================================
// Système d'icônes (trait, style Lucide) — inline, sans dépendance
// Usage : <span data-icon="calendar"></span>  (hydraté automatiquement)
// =============================================
const LINE_ICONS = {
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  bot: '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
  messages: '<path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/>',
  message: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  pill: '<path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  folder: '<path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  stethoscope: '<path d="M11 2v2"/><path d="M5 2v2"/><path d="M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1"/><path d="M8 15a6 6 0 0 0 12 0v-3"/><circle cx="20" cy="10" r="2"/>',
  pulse: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  timer: '<line x1="10" x2="14" y1="2" y2="2"/><line x1="12" x2="15" y1="14" y2="11"/><circle cx="12" cy="14" r="8"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  paperclip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
  bars: '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  watch: '<circle cx="12" cy="12" r="6"/><polyline points="12 10 12 12 13 13"/><path d="m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05"/><path d="m7.88 16.36.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
};

// Icônes du menu, choisies par destination
const NAV_ICON_BY_HREF = {
  '/dashboard': 'grid',
  '/chat': 'bot',
  '/messages': 'messages',
  '/symptoms': 'activity',
  '/medications': 'pill',
  '/appointments': 'calendar',
  '/documents': 'folder',
  '/profile': 'user',
};

function svgIcon(name, size) {
  const inner = LINE_ICONS[name];
  if (!inner) return '';
  const s = size || 20;
  return `<svg class="ico" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

// Remplace le contenu de tout élément [data-icon] par le SVG correspondant (une seule fois)
function hydrateIcons(root) {
  (root || document).querySelectorAll('[data-icon]:not([data-icon-done])').forEach((el) => {
    const name = el.getAttribute('data-icon');
    if (!LINE_ICONS[name]) return;
    el.innerHTML = svgIcon(name, Number(el.getAttribute('data-icon-size')) || 18);
    el.setAttribute('data-icon-done', '');
  });
}

// Auto-hydratation : au chargement + à chaque ajout de DOM (rendus dynamiques)
document.addEventListener('DOMContentLoaded', () => {
  hydrateIcons(document);
  const mo = new MutationObserver((muts) => {
    for (const m of muts) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) {
          if (node.hasAttribute && node.hasAttribute('data-icon')) hydrateIcons(node.parentNode || document);
          if (node.querySelector && node.querySelector('[data-icon]')) hydrateIcons(node);
        }
      }
    }
  });
  mo.observe(document.body, { childList: true, subtree: true });
});

// Auth helpers
function getToken() {
  return localStorage.getItem('sp_token');
}

function getUser() {
  const raw = localStorage.getItem('sp_user');
  return raw ? JSON.parse(raw) : null;
}

function setAuth(token, user) {
  localStorage.setItem('sp_token', token);
  localStorage.setItem('sp_user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('sp_token');
  localStorage.removeItem('sp_user');
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = '/';
  }
}

function logout() {
  clearAuth();
  window.location.href = '/';
}

// API fetch helper
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  // Session expirée -> retour à l'accueil.
  // MAIS on ne redirige pas sur les routes d'authentification (connexion,
  // inscription, confirmation) : un 401/403 y signifie « identifiants
  // incorrects » ou « e-mail non confirmé », et le message doit s'afficher
  // sur le formulaire. Idem si aucun jeton n'est stocké : il n'y a pas de
  // session à invalider.
  const isAuthEndpoint = endpoint.startsWith('/auth/');
  if ((res.status === 401 || res.status === 403) && !isAuthEndpoint && token) {
    clearAuth();
    window.location.href = '/';
    return;
  }

  const contentType = res.headers.get('content-type') || '';
  const rawBody = await res.text();
  let data = {};

  if (rawBody && contentType.includes('application/json')) {
    try {
      data = JSON.parse(rawBody);
    } catch (error) {
      throw new Error('Réponse JSON invalide du serveur. Redémarrez le serveur.');
    }
  } else if (rawBody) {
    throw new Error(`La route API ${endpoint} a renvoyé une page HTML. Redémarrez le serveur avec npm start.`);
  }

  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}

// Toast notifications
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Date helpers
function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

function formatTime(str) {
  return str ? str.slice(0, 5) : '';
}

function getDay(dateStr) {
  return new Date(dateStr).getDate();
}

function getMonthShort(dateStr) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { month: 'short' });
}

function isToday(dateStr) {
  const today = new Date().toISOString().split('T')[0];
  return dateStr === today;
}

function isFuture(dateStr) {
  return new Date(dateStr) >= new Date(new Date().toISOString().split('T')[0]);
}

// Recovery days calculation
function getDaysSinceDischarge(dateStr) {
  if (!dateStr) return 0;
  const discharge = new Date(dateStr);
  const today = new Date();
  return Math.floor((today - discharge) / (1000 * 60 * 60 * 24));
}

// Sidebar active link
function initSidebar() {
  const path = window.location.pathname;
  const links = document.querySelectorAll('.nav-link');
  links.forEach(link => {
    if (link.dataset.href === path) {
      link.classList.add('active');
    }
    link.addEventListener('click', () => {
      window.location.href = link.dataset.href;
    });
    // Icône trait à la place de l'emoji
    const iconEl = link.querySelector('.nav-icon');
    if (iconEl) {
      let name = NAV_ICON_BY_HREF[link.dataset.href] || 'grid';
      // Le dashboard médecin porte un pictogramme spécifique
      if (link.dataset.href === '/dashboard' && /médecin|medecin/i.test(link.textContent)) name = 'stethoscope';
      iconEl.innerHTML = svgIcon(name, 18);
    }
  });

  // Logo + bouton déconnexion
  document.querySelectorAll('.sidebar-logo-icon').forEach((el) => { el.innerHTML = svgIcon('pulse', 22); });
  document.querySelectorAll('.sidebar-footer button').forEach((btn) => {
    if (/déconnect|deconnect/i.test(btn.textContent)) {
      btn.innerHTML = `${svgIcon('logout', 16)}<span>Se déconnecter</span>`;
    }
  });

  // User info in sidebar
  const user = getUser();
  if (user) {
    const avatarEl = document.getElementById('sidebarAvatar');
    const nameEl = document.getElementById('sidebarName');
    const roleEl = document.getElementById('sidebarRole');
    if (avatarEl) avatarEl.textContent = user.profile.avatar || '👤';
    if (nameEl) nameEl.textContent = `${user.profile.firstName} ${user.profile.lastName}`;
    if (roleEl) roleEl.textContent = user.role === 'patient' ? 'Patient' : 'Médecin';
  }

  // Topbar user avatar
  const topbarAvatar = document.getElementById('topbarAvatar');
  if (topbarAvatar && user) {
    topbarAvatar.textContent = user.profile.avatar || '👤';
  }

  // Pastille "messages non lus" sur le lien Messagerie
  refreshUnreadMessagesBadge();
}

async function refreshUnreadMessagesBadge() {
  const link = document.querySelector('.nav-link[data-href="/messages"]');
  if (!link || !getToken()) return;
  try {
    const { count } = await apiFetch('/messages/unread-count');
    let badge = link.querySelector('.nav-badge');
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-badge';
        link.appendChild(badge);
      }
      badge.textContent = count > 9 ? '9+' : count;
    } else if (badge) {
      badge.remove();
    }
  } catch (e) {
    /* silencieux */
  }
}

// Simple markdown renderer
function renderMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*$)/gm, '<h4>$1</h4>')
    .replace(/^## (.*$)/gm, '<h3>$1</h3>')
    .replace(/^# (.*$)/gm, '<h2>$1</h2>')
    .replace(/^- (.*$)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/gs, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[uh]|<li|<p)(.*$)/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/\n/g, '<br>');
}

// Modal helpers
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.add('open');
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove('open');
}

// Cartes cliquables (role="link") : support clavier Entrée / Espace
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = e.target.closest('.is-clickable[role="link"]');
  if (!el) return;
  e.preventDefault();
  el.click();
});
