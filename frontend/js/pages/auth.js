(function (window, document) {
  'use strict';

  var app = window.SweetLog = window.SweetLog || {};
  var ui = app.ui;
  var api = app.api;
  var auth = app.auth;

  function initLogin() {
    var form = document.querySelector('[data-login-form]');
    if (!form) return;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      var registration = form.querySelector('[name="numero_matricula"]');
      var password = form.querySelector('#senha');
      if (!registration.value.trim() || !password.value) {
        ui.toast('Informe a matrícula e a senha.', 'error');
        return;
      }
      if (!/^\d+$/.test(registration.value.trim()) || Number(registration.value) <= 0) {
        ui.toast('A matrícula deve ser um número inteiro positivo.', 'error');
        return;
      }
      ui.setBusy(button, true, 'Entrando...');
      try {
        var result = await api.post('/funcionarios/login', {
          numero_matricula: Number(registration.value),
          senha: password.value
        }, { auth: false });
        if (!result || !result.token || !result.funcionario) throw new Error('A API não retornou uma sessão válida.');
        auth.setSession(result, !!form.querySelector('input[type="checkbox"]:checked'));
        window.location.href = 'dashboard.html';
      } catch (error) {
        ui.toast(error.message, 'error');
        ui.setBusy(button, false);
      }
    });
  }

  function getRecoveryPhone() {
    try { return window.sessionStorage.getItem(auth.phoneKey) || ''; } catch (error) { return ''; }
  }

  function setRecoveryPhone(phone) {
    try { window.sessionStorage.setItem(auth.phoneKey, phone); } catch (error) { /* armazenamento opcional */ }
  }

  function initRecoverPassword() {
    var form = document.querySelector('[data-recuperar-form]');
    if (!form) return;
    var phone = form.querySelector('[name="telefone"]');
    var button = form.querySelector('[type="submit"]');
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var digits = phone.value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 11) {
        ui.toast('Informe um telefone válido com DDD.', 'error');
        phone.focus();
        return;
      }
      ui.setBusy(button, true, 'Enviando...');
      try {
        var result = await api.post('/funcionarios/recuperar-senha', { telefone: digits }, { auth: false });
        setRecoveryPhone(digits);
        ui.toast(result.mensagem || 'Solicitação enviada.', 'success');
        window.setTimeout(function () { window.location.href = 'verificar-codigo.html'; }, 900);
      } catch (error) {
        ui.toast(error.message, 'error');
        ui.setBusy(button, false);
      }
    });
    phone.addEventListener('input', function () {
      var digits = phone.value.replace(/\D/g, '').slice(0, 11);
      if (digits.length <= 2) phone.value = digits ? '(' + digits : '';
      else if (digits.length <= 6) phone.value = '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
      else if (digits.length <= 10) phone.value = '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
      else phone.value = '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
    });
  }

  function initVerifyCode() {
    var form = document.querySelector('[data-codigo-form]');
    if (!form) return;
    var inputs = Array.prototype.slice.call(form.querySelectorAll('.otp-box'));
    var resend = form.querySelector('[data-resend-code]');
    var phone = getRecoveryPhone();

    if (!phone) {
      ui.toast('Informe seu telefone antes de verificar o código.', 'error');
      window.location.replace('recuperar-senha.html');
      return;
    }

    inputs.forEach(function (input, index) {
      input.addEventListener('input', function () {
        input.value = input.value.replace(/\D/g, '').slice(-1);
        if (input.value && inputs[index + 1]) inputs[index + 1].focus();
      });
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Backspace' && !input.value && inputs[index - 1]) inputs[index - 1].focus();
      });
      input.addEventListener('paste', function (event) {
        var pasted = (event.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        event.preventDefault();
        pasted.split('').forEach(function (digit, digitIndex) { if (inputs[digitIndex]) inputs[digitIndex].value = digit; });
        inputs[Math.min(pasted.length, inputs.length - 1)].focus();
      });
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var code = inputs.map(function (input) { return input.value; }).join('');
      if (!/^\d{6}$/.test(code)) {
        ui.toast('Digite os seis números do código.', 'error');
        return;
      }
      var button = form.querySelector('[type="submit"]');
      ui.setBusy(button, true, 'Verificando...');
      try {
        var result = await api.post('/funcionarios/verificar-codigo', { telefone: phone, codigo: code }, { auth: false });
        if (!result.token_redefinicao) throw new Error('A API não retornou o token de redefinição.');
        window.sessionStorage.setItem(auth.resetTokenKey, result.token_redefinicao);
        ui.toast(result.mensagem || 'Código confirmado.', 'success');
        window.setTimeout(function () { window.location.href = 'nova-senha.html'; }, 700);
      } catch (error) {
        ui.toast(error.message, 'error');
        ui.setBusy(button, false);
      }
    });

    if (resend) resend.addEventListener('click', async function (event) {
      event.preventDefault();
      resend.setAttribute('aria-disabled', 'true');
      try {
        var result = await api.post('/funcionarios/recuperar-senha', { telefone: phone }, { auth: false });
        ui.toast(result.mensagem || 'Solicitação reenviada.', 'success');
      } catch (error) {
        ui.toast(error.message, 'error');
      } finally {
        resend.removeAttribute('aria-disabled');
      }
    });
  }

  function initNewPassword() {
    var form = document.querySelector('[data-senha-form]');
    if (!form) return;
    var inputs = form.querySelectorAll('input[type="password"]');
    var password = inputs[0];
    var confirmation = inputs[1];
    var phone = getRecoveryPhone();
    var resetToken = '';
    try { resetToken = window.sessionStorage.getItem(auth.resetTokenKey) || ''; } catch (error) { /* noop */ }

    if (!phone || !resetToken) {
      ui.toast('Valide o código de recuperação antes de redefinir a senha.', 'error');
      window.location.replace('recuperar-senha.html');
      return;
    }

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (!password.value || !confirmation.value) {
        ui.toast('Preencha a nova senha e a confirmação.', 'error');
        return;
      }
      if (password.value.length < 8) {
        ui.toast('A senha deve ter no mínimo 8 caracteres.', 'error');
        return;
      }
      if (password.value !== confirmation.value) {
        ui.toast('As senhas não coincidem.', 'error');
        confirmation.focus();
        return;
      }
      var button = form.querySelector('[type="submit"]');
      ui.setBusy(button, true, 'Salvando...');
      try {
        var result = await api.post('/funcionarios/redefinir-senha', {
          telefone: phone,
          token_redefinicao: resetToken,
          nova_senha: password.value
        }, { auth: false });
        window.sessionStorage.removeItem(auth.resetTokenKey);
        window.sessionStorage.removeItem(auth.phoneKey);
        ui.toast(result.mensagem || 'Senha redefinida com sucesso.', 'success');
        window.setTimeout(function () { window.location.href = 'login.html'; }, 1000);
      } catch (error) {
        ui.toast(error.message, 'error');
        ui.setBusy(button, false);
      }
    });
  }

  app.pages = app.pages || {};
  app.pages.initAuth = function () {
    initLogin();
    initRecoverPassword();
    initVerifyCode();
    initNewPassword();
  };
})(window, document);
