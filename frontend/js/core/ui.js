import { clearSession, getSession } from './session.js';

export function toast(message, type = 'info') {
  let container = document.querySelector('[data-toast-container]');
  if (!container) {
    container = document.createElement('div');
    container.dataset.toastContainer = '';
    container.className = 'toast-container';
    document.body.append(container);
  }
  const item = document.createElement('div');
  item.className = `toast toast--${type}`;
  item.textContent = message;
  container.append(item);
  requestAnimationFrame(() => item.classList.add('is-visible'));
  window.setTimeout(() => {
    item.classList.remove('is-visible');
    window.setTimeout(() => item.remove(), 250);
  }, 3500);
}

function warnFieldLimit(input, message) {
  if (input.dataset.limitWarning === message) return;
  input.dataset.limitWarning = message;
  toast(message, 'warning');
  window.setTimeout(() => {
    if (input.dataset.limitWarning === message) delete input.dataset.limitWarning;
  }, 3500);
}

function fieldLabel(input) {
  return input.labels?.[0]?.textContent.trim().replace(/\s*\*$/, '') || input.getAttribute('aria-label') || 'Este campo';
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

export function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function dateForInput(value) {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

export function formatDate(value) {
  const dateValue = dateForInput(value);
  if (!dateValue) return '—';
  const [year, month, day] = dateValue.split('-');
  return `${day}/${month}/${year}`;
}

export function formatPhone(value) {
  const raw = String(value ?? '');
  const digits = raw.replace(/\D/g, '');
  if (!digits || digits.length > 11) return raw;
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'SL';
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}

export function setButtonLoading(button, loading, loadingText = 'Salvando...') {
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.textContent = loadingText;
  } else {
    button.disabled = false;
    if (button.dataset.originalText) button.textContent = button.dataset.originalText;
    delete button.dataset.originalText;
  }
}

export function getPageName() {
  return location.pathname.split('/').filter(Boolean).pop() || 'index.html';
}

const ALL_ROLES = ['Administrador', 'RH', 'Administrativo', 'Logística', 'Compras', 'Almoxarifado'];
const ROLE_ACCESS = {
  'dashboard.html': ['Administrador', 'Administrativo', 'Almoxarifado', 'Logística'],
  'produtos-lista.html': ALL_ROLES,
  'produto-detalhe.html': ALL_ROLES,
  'produto-cadastrar.html': ['Administrador', 'Almoxarifado', 'Compras'],
  'estoque.html': ['Administrador', 'Almoxarifado', 'Logística', 'Compras'],
  'saldo-diario.html': ['Administrador', 'Administrativo'],
  'lotes.html': ['Administrador', 'Almoxarifado', 'Logística', 'Compras'],
  'estoque-entrada.html': ['Administrador', 'Almoxarifado', 'Logística', 'Compras'],
  'estoque-saida.html': ['Administrador', 'Almoxarifado', 'Logística'],
  'vendas.html': ['Administrador', 'Administrativo', 'Almoxarifado', 'Logística'],
  'venda-detalhe.html': ['Administrador', 'Administrativo', 'Almoxarifado', 'Logística'],
  'funcionariosMatricula.html': ['Administrador', 'RH'],
  'novaMatricula.html': ['Administrador', 'RH']
};

const ROLE_PERMISSIONS = {
  'create-products': ['Administrador', 'Almoxarifado', 'Compras'],
  'manage-products': ['Administrador', 'Almoxarifado'],
  'manage-sales': ['Administrador', 'Administrativo', 'Almoxarifado', 'Logística'],
  'write-stock': ['Administrador', 'Almoxarifado', 'Logística'],
  'enter-stock': ['Administrador', 'Almoxarifado', 'Logística', 'Compras'],
  'manage-registrations': ['Administrador', 'RH']
};

export function canAccess(page, role) {
  return !ROLE_ACCESS[page] || ROLE_ACCESS[page].includes(role);
}

export function hasPermission(permission, role) {
  return ROLE_PERMISSIONS[permission]?.includes(role) || false;
}

function hideUnauthorizedLinks(role) {
  document.querySelectorAll('a[href]').forEach(link => {
    const target = (link.getAttribute('href') || '').split(/[?#]/)[0];
    const page = target.split('/').pop();
    if (/\.html$/i.test(page) && !canAccess(page, role)) link.hidden = true;
  });
}

export function applyRoleVisibility(role) {
  document.querySelectorAll('[data-permission]').forEach(element => {
    if (!hasPermission(element.dataset.permission, role)) element.hidden = true;
  });
  hideUnauthorizedLinks(role);
}

export function requirePageAccess() {
  const session = getSession();
  const page = getPageName();
  const publicPages = ['login.html', 'cadastro.html', 'recuperar-senha.html', 'verificar-codigo.html', 'nova-senha.html'];
  if (publicPages.includes(page)) return session;
  if (!session?.token) {
    location.replace('login.html');
    return null;
  }
  if (session.expiresAt && session.expiresAt <= Date.now()) {
    clearSession();
    location.replace('login.html');
    return null;
  }
  if (!canAccess(page, session.funcionario?.setor)) {
    toast('Seu cargo não possui acesso a esta tela.', 'error');
    location.replace(canAccess('dashboard.html', session.funcionario?.setor) ? 'dashboard.html' : 'produtos-lista.html');
    return null;
  }
  return session;
}

export function updateProfile(session = getSession()) {
  if (!session?.funcionario) return;
  const employee = session.funcionario;
  const name = employee.nome || 'Funcionário';
  const registration = employee.numero_matricula || '—';
  const role = employee.setor || '—';
  const phone = employee.telefone ? formatPhone(employee.telefone) : 'Não informado';
  document.querySelectorAll('[data-open-profile]').forEach(button => {
    button.textContent = initials(name);
    button.setAttribute('aria-label', `Abrir perfil de ${name}`);
  });
  document.querySelectorAll('.profile-pop__avatar').forEach(element => element.textContent = initials(name));
  document.querySelectorAll('.profile-pop__info strong').forEach(element => element.textContent = name);
  document.querySelectorAll('.profile-pop__info p').forEach(element => {
    element.replaceChildren(
      document.createTextNode(`Matrícula: ${registration}`), document.createElement('br'),
      document.createTextNode(`Setor: ${role}`), document.createElement('br'),
      document.createTextNode(`Telefone: ${phone}`)
    );
  });
}

export function initGlobalNavigation(session = getSession()) {
  const openButton = document.querySelector('[data-open-menu]');
  const closeButton = document.querySelector('[data-close-menu]');
  const drawer = document.querySelector('[data-drawer]');
  const overlay = document.querySelector('[data-drawer-overlay]');
  const open = () => { drawer?.classList.add('is-open'); overlay?.classList.add('is-open'); };
  const close = () => { drawer?.classList.remove('is-open'); overlay?.classList.remove('is-open'); };
  openButton?.addEventListener('click', open);
  closeButton?.addEventListener('click', close);
  overlay?.addEventListener('click', close);
  document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });

  const nav = document.querySelector('.drawer nav');
  if (nav && !nav.querySelector('a[href="funcionariosMatricula.html"]')) {
    const link = document.createElement('a');
    link.className = 'drawer__link';
    link.href = 'funcionariosMatricula.html';
    link.innerHTML = '<span class="ico">👥</span> Funcionários e Matrículas';
    nav.append(link);
  }
  applyRoleVisibility(session?.funcionario?.setor);

  const current = getPageName();
  nav?.querySelectorAll('.drawer__link').forEach(link => {
    link.classList.toggle('is-active', link.getAttribute('href')?.split('#')[0] === current);
  });

  const profileButton = document.querySelector('[data-open-profile]');
  const profilePopover = document.querySelector('[data-profile-pop]');
  profileButton?.addEventListener('click', event => {
    event.stopPropagation();
    profilePopover?.classList.toggle('is-open');
  });
  document.addEventListener('click', event => {
    if (profilePopover && !profilePopover.contains(event.target) && !profileButton?.contains(event.target)) {
      profilePopover.classList.remove('is-open');
    }
  });
  document.querySelectorAll('.profile-pop__logout, .menu-lateral-sair, .drawer__logout').forEach(button => {
    button.addEventListener('click', () => {
      clearSession();
      location.replace('login.html');
    });
  });
  updateProfile(session);
}

export function initCommonControls() {
  document.addEventListener('input', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'number' || !input.value || !input.max) return;
    if (input.valueAsNumber > Number(input.max)) {
      warnFieldLimit(input, `${fieldLabel(input)} aceita no máximo ${Number(input.max).toLocaleString('pt-BR')}.`);
    } else {
      delete input.dataset.limitWarning;
    }
  });
  document.addEventListener('beforeinput', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) || input.maxLength < 0 || event.data === null) return;
    const selectionLength = input.selectionEnd - input.selectionStart;
    if (input.value.length - selectionLength + event.data.length > input.maxLength) {
      warnFieldLimit(input, `${fieldLabel(input)} permite no máximo ${input.maxLength} caracteres.`);
    }
  });
  document.addEventListener('paste', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) || input.maxLength < 0) return;
    const pastedText = event.clipboardData?.getData('text') || '';
    const selectionLength = input.selectionEnd - input.selectionStart;
    if (input.value.length - selectionLength + pastedText.length > input.maxLength) {
      warnFieldLimit(input, `${fieldLabel(input)} permite no máximo ${input.maxLength} caracteres.`);
    }
  });
  document.addEventListener('invalid', event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
    if (input.validity.rangeOverflow && input.max) {
      warnFieldLimit(input, `${fieldLabel(input)} aceita no máximo ${Number(input.max).toLocaleString('pt-BR')}.`);
    } else if (input.validity.tooLong && input.maxLength >= 0) {
      warnFieldLimit(input, `${fieldLabel(input)} permite no máximo ${input.maxLength} caracteres.`);
    }
  }, true);
  document.addEventListener('submit', event => {
    const fields = event.target.querySelectorAll('input:not(:disabled), textarea:not(:disabled)');
    for (const input of fields) {
      const max = input.type === 'number' && input.max ? Number(input.max) : null;
      if (max !== null && input.value && input.valueAsNumber > max) {
        event.preventDefault();
        event.stopImmediatePropagation();
        warnFieldLimit(input, `${fieldLabel(input)} aceita no máximo ${max.toLocaleString('pt-BR')}.`);
        input.focus();
        return;
      }
      if (input.maxLength >= 0 && input.value.length > input.maxLength) {
        event.preventDefault();
        event.stopImmediatePropagation();
        warnFieldLimit(input, `${fieldLabel(input)} permite no máximo ${input.maxLength} caracteres.`);
        input.focus();
        return;
      }
      const maxMb = Number(input.dataset.maxMb || 0);
      if (input.type === 'file' && input.files?.[0] && maxMb && input.files[0].size > maxMb * 1024 * 1024) {
        event.preventDefault();
        event.stopImmediatePropagation();
        warnFieldLimit(input, `O arquivo deve ter no máximo ${maxMb} MB.`);
        input.focus();
        return;
      }
    }
  }, true);
  document.querySelectorAll('[data-stepper]').forEach(stepper => {
    const input = stepper.querySelector('[data-stepper-value]');
    stepper.querySelector('[data-stepper-minus]')?.addEventListener('click', () => {
      const min = Number(input?.min || 1);
      if (input) { input.value = String(Math.max(min, Number(input.value || min) - 1)); input.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    stepper.querySelector('[data-stepper-plus]')?.addEventListener('click', () => {
      const max = Number(input?.max || Infinity);
      if (input) { input.value = String(Math.min(max, Number(input.value || 1) + 1)); input.dispatchEvent(new Event('input', { bubbles: true })); }
    });
  });
  document.querySelectorAll('[data-cancel-btn]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.cancelHref) location.href = button.dataset.cancelHref;
      else history.back();
    });
  });
  document.querySelectorAll('[data-upload-input]').forEach(input => {
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      const box = input.closest('[data-upload-box]');
      const text = box?.querySelector('[data-upload-text]');
      if (text) text.textContent = file ? file.name : 'Anexar arquivo ou arraste e solte';
      const maxMb = Number(input.dataset.maxMb || 0);
      if (file && maxMb && file.size > maxMb * 1024 * 1024) {
        input.value = '';
        if (text) text.textContent = 'Anexar arquivo ou arraste e solte';
        toast(`O arquivo excede o limite de ${maxMb} MB.`, 'warning');
      }
    });
  });
  document.querySelectorAll('[data-today]').forEach(element => {
    element.textContent = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    }).format(new Date());
  });
}
