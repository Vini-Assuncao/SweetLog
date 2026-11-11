const SESSION_KEY = 'sweetlog-session';
const RECOVERY_KEY = 'sweetlog-password-recovery';

function read(storage) {
  try {
    const value = storage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    storage.removeItem(SESSION_KEY);
    return null;
  }
}

export function getSession() {
  return read(sessionStorage) || read(localStorage);
}

export function getToken() {
  return getSession()?.token || null;
}

export function saveSession(payload, remember = false) {
  clearSession();
  const session = {
    token: payload.token,
    funcionario: payload.funcionario,
    expiresAt: Date.now() + Number(payload.expira_em_segundos || 28800) * 1000
  };
  (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function saveRecovery(payload) {
  sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(payload));
}

export function getRecovery() {
  try {
    return JSON.parse(sessionStorage.getItem(RECOVERY_KEY) || 'null');
  } catch {
    sessionStorage.removeItem(RECOVERY_KEY);
    return null;
  }
}

export function clearRecovery() {
  sessionStorage.removeItem(RECOVERY_KEY);
}
