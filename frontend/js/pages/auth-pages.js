import { api } from '../core/api.js';
import { saveSession, saveRecovery, getRecovery, clearRecovery } from '../core/session.js';
import { toast, setButtonLoading } from '../core/ui.js';

export function initLoginPage() {
  const form = document.querySelector('[data-login-form]');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const registration = form.querySelector('#matricula')?.value.trim();
    const password = form.querySelector('#senha')?.value;
    if (!registration || !password) {
      toast('Informe a matrícula e a senha.', 'error');
      return;
    }
    setButtonLoading(button, true, 'Entrando...');
    try {
      const result = await api.post('/funcionarios/login', {
        numero_matricula: registration,
        senha: password
      }, { auth: false, redirectOnUnauthorized: false });
      saveSession(result, Boolean(form.querySelector('input[type="checkbox"]')?.checked));
      toast('Login realizado com sucesso.', 'success');
      location.replace('dashboard.html');
    } catch (error) {
      toast(error.message || 'Não foi possível entrar.', 'error');
    } finally {
      setButtonLoading(button, false);
    }
  });
}

export function initRecoveryPage() {
  const form = document.querySelector('[data-recovery-form]');
  if (!form) return;
  const phone = form.querySelector('#telefone');
  phone?.addEventListener('input', () => {
    const digits = phone.value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) phone.value = digits ? `(${digits}` : '';
    else if (digits.length <= 6) phone.value = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    else if (digits.length <= 10) phone.value = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    else phone.value = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const digits = phone?.value.replace(/\D/g, '') || '';
    if (!/^\d{10,11}$/.test(digits)) {
      toast('Informe um telefone com DDD.', 'error');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Enviando...');
    try {
      await api.post('/funcionarios/recuperar-senha', { telefone: digits }, { auth: false });
      saveRecovery({ telefone: digits });
      toast('Solicitação processada. Confira o SMS, caso o número esteja cadastrado.', 'success');
      location.href = 'verificar-codigo.html';
    } catch (error) {
      toast(error.message || 'Não foi possível solicitar a recuperação.', 'error');
    } finally {
      setButtonLoading(button, false);
    }
  });
}

export function initVerifyCodePage() {
  const form = document.querySelector('[data-codigo-form]');
  if (!form) return;
  const recovery = getRecovery();
  if (!recovery?.telefone) {
    toast('Inicie a recuperação informando seu telefone.', 'error');
    location.replace('recuperar-senha.html');
    return;
  }

  const digits = [...form.querySelectorAll('[data-code-digit], .otp-box')];
  digits.forEach((input, index) => {
    input.inputMode = 'numeric';
    input.maxLength = 1;
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(-1);
      if (input.value && digits[index + 1]) digits[index + 1].focus();
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'Backspace' && !input.value && digits[index - 1]) digits[index - 1].focus();
    });
    input.addEventListener('paste', event => {
      const text = event.clipboardData?.getData('text') || '';
      const code = text.replace(/\D/g, '').slice(0, 6);
      if (code.length) {
        event.preventDefault();
        digits.forEach((field, digitIndex) => { field.value = code[digitIndex] || ''; });
        digits[Math.min(code.length, digits.length) - 1]?.focus();
      }
    });
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const code = digits.map(input => input.value).join('');
    if (!/^\d{6}$/.test(code)) {
      toast('Informe os seis dígitos recebidos por SMS.', 'error');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Verificando...');
    try {
      const result = await api.post('/funcionarios/verificar-codigo', {
        telefone: recovery.telefone,
        codigo: code
      }, { auth: false });
      saveRecovery({ ...recovery, token_redefinicao: result.token_redefinicao });
      location.href = 'nova-senha.html';
    } catch (error) {
      toast(error.message || 'Código inválido ou expirado.', 'error');
    } finally {
      setButtonLoading(button, false);
    }
  });

  const resend = form.querySelector('[data-resend-code]');
  resend?.addEventListener('click', async event => {
    event.preventDefault();
    try {
      await api.post('/funcionarios/recuperar-senha', { telefone: recovery.telefone }, { auth: false });
      toast('Solicitação de novo código enviada.', 'success');
    } catch (error) {
      toast(error.message || 'Não foi possível reenviar o código.', 'error');
    }
  });
}

export function initResetPasswordPage() {
  const form = document.querySelector('[data-reset-form]');
  if (!form) return;
  const recovery = getRecovery();
  if (!recovery?.telefone || !recovery?.token_redefinicao) {
    toast('Verifique o código recebido antes de redefinir a senha.', 'error');
    location.replace('recuperar-senha.html');
    return;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const password = form.querySelector('#nova')?.value || '';
    const confirmation = form.querySelector('#confirma')?.value || '';
    if (password.length < 8) {
      toast('A senha deve conter pelo menos 8 caracteres.', 'error');
      return;
    }
    if (password !== confirmation) {
      toast('As senhas não coincidem.', 'error');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Redefinindo...');
    try {
      const result = await api.post('/funcionarios/redefinir-senha', {
        telefone: recovery.telefone,
        token_redefinicao: recovery.token_redefinicao,
        nova_senha: password
      }, { auth: false });
      clearRecovery();
      toast(result.mensagem || 'Senha redefinida com sucesso.', 'success');
      location.href = 'login.html';
    } catch (error) {
      toast(error.message || 'Não foi possível redefinir a senha.', 'error');
    } finally {
      setButtonLoading(button, false);
    }
  });
}
