(function (window) {
  'use strict';

  var app = window.SweetLog = window.SweetLog || {};
  var TOKEN_KEY = 'sweetlog-token';
  var USER_KEY = 'sweetlog-user';
  var PHONE_KEY = 'sweetlog-recovery-phone';
  var RESET_TOKEN_KEY = 'sweetlog-reset-token';

  function read(storage, key) {
    try { return storage.getItem(key); } catch (error) { return null; }
  }

  function getToken() {
    return read(window.localStorage, TOKEN_KEY) || read(window.sessionStorage, TOKEN_KEY);
  }

  function getUser() {
    var raw = read(window.localStorage, USER_KEY) || read(window.sessionStorage, USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (error) { return null; }
  }

  function setSession(result, remember) {
    clearSession();
    var storage = remember ? window.localStorage : window.sessionStorage;
    storage.setItem(TOKEN_KEY, result.token);
    storage.setItem(USER_KEY, JSON.stringify(result.funcionario || {}));
  }

  function clearSession() {
    [window.localStorage, window.sessionStorage].forEach(function (storage) {
      try {
        storage.removeItem(TOKEN_KEY);
        storage.removeItem(USER_KEY);
      } catch (error) {
        // O restante da aplicação continua funcional mesmo se o navegador bloquear storage.
      }
    });
  }

  function logout(redirect) {
    clearSession();
    if (redirect !== false) window.location.href = 'login.html';
  }

  function isPublicPage() {
    var path = window.location.pathname.toLowerCase();
    return /(^|\/)(index|login|recuperar-senha|verificar-codigo|nova-senha)\.html$/.test(path);
  }

  function requireSession() {
    if (!isPublicPage() && !getToken()) {
      window.location.replace('login.html');
      return false;
    }
    return true;
  }

  function handleUnauthorized() {
    if (isPublicPage()) return;
    clearSession();
    if (!/login\.html$/i.test(window.location.pathname)) {
      window.location.replace('login.html?motivo=sessao');
    }
  }

  app.auth = {
    getToken: getToken,
    getUser: getUser,
    setSession: setSession,
    clearSession: clearSession,
    logout: logout,
    requireSession: requireSession,
    handleUnauthorized: handleUnauthorized,
    phoneKey: PHONE_KEY,
    resetTokenKey: RESET_TOKEN_KEY
  };
})(window);
