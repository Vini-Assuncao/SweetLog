import { api } from '../core/api.js';
import { saveSession, saveRecovery, getRecovery, clearRecovery } from '../core/session.js';
import { toast, setButtonLoading } from '../core/ui.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return email.length <= 254 && EMAIL_PATTERN.test(email) ? email : '';
}

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

export function initSignupPage() {
  const form = document.querySelector('[data-signup-form]');
  if (!form) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const registration = form.querySelector('#matricula')?.value.trim() || '';
    const name = form.querySelector('#nome')?.value.trim() || '';
    const password = form.querySelector('#senha')?.value || '';
    const confirmation = form.querySelector('#confirma-senha')?.value || '';
    const email = normalizeEmail(form.querySelector('#email')?.value);

    if (!/^[1-9]\d*$/.test(registration)) {
      toast('Informe uma matrícula válida.', 'error');
      return;
    }
    if (!name || name.length > 100) {
      toast('Informe seu nome (máximo de 100 caracteres).', 'error');
      return;
    }
    if (password.trim().length < 8 || new TextEncoder().encode(password.trim()).length > 72) {
      toast('A senha deve ter pelo menos 8 caracteres e no máximo 72 bytes.', 'error');
      return;
    }
    if (password !== confirmation) {
      toast('As senhas não coincidem.', 'error');
      return;
    }
    if (!email) {
      toast('Informe um e-mail válido. Ele será usado para recuperar sua senha.', 'error');
      return;
    }

    const button = form.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Cadastrando...');
    try {
      const result = await api.post('/funcionarios/cadastro', {
        numero_matricula: registration,
        nome: name,
        senha: password,
        email
      }, { auth: false, redirectOnUnauthorized: false });
      form.hidden = true;
      const success = document.querySelector('[data-signup-success]');
      if (success) {
        success.hidden = false;
        const message = success.querySelector('[data-signup-message]');
        if (message) message.textContent = result.mensagem || 'Cadastro concluído. Você já pode entrar.';
      }
    } catch (error) {
      toast(error.message || 'Não foi possível concluir o cadastro.', 'error');
    } finally {
      setButtonLoading(button, false);
    }
  });
}

export function initRecoveryPage() {
  const form = document.querySelector('[data-recovery-form]');
  if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const email = normalizeEmail(form.querySelector('#email')?.value);
    if (!email) {
      toast('Informe um e-mail válido.', 'error');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Enviando...');
    try {
      await api.post('/funcionarios/recuperar-senha', { email }, { auth: false });
      saveRecovery({ email });
      toast('Solicitação processada. Confira seu e-mail, caso ele esteja cadastrado.', 'success');
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
  if (!recovery?.email) {
    toast('Inicie a recuperação informando seu e-mail.', 'error');
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
      toast('Informe os seis dígitos recebidos por e-mail.', 'error');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Verificando...');
    try {
      const result = await api.post('/funcionarios/verificar-codigo', {
        email: recovery.email,
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
      await api.post('/funcionarios/recuperar-senha', { email: recovery.email }, { auth: false });
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
  if (!recovery?.email || !recovery?.token_redefinicao) {
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
        email: recovery.email,
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
