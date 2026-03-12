// =============================================
// SuiviPatient - Utilitaires globaux
// =============================================

const API_BASE = '/api';

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

  if (res.status === 401 || res.status === 403) {
    clearAuth();
    window.location.href = '/';
    return;
  }

  const data = await res.json();
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
