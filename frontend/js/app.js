// =========================================================
// SweetLog — app.js
// Utilitários compartilhados + comportamento de todas as telas
// =========================================================

// ---------- toast de feedback ----------
function showToast(message, type) {
  type = type || 'info';
  var container = document.querySelector('[data-toast-container]');
  if (!container) {
    container = document.createElement('div');
    container.setAttribute('data-toast-container', '');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  var toast = document.createElement('div');
  toast.className = 'toast toast--' + type;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(function () { toast.classList.add('is-visible'); });

  setTimeout(function () {
    toast.classList.remove('is-visible');
    setTimeout(function () { toast.remove(); }, 250);
  }, 3200);
}

// ---------- redireciona depois de dar tempo de o toast ser lido ----------
function redirectAfterToast(url, delay) {
  setTimeout(function () {
    window.location.href = url;
  }, delay || 1200);
}

// ---------- máscara de telefone: (11) 90000-0000 ----------
function formatPhone(digits) {
  digits = digits.slice(0, 11);
  if (!digits.length) return '';
  if (digits.length <= 2) return '(' + digits;
  if (digits.length <= 6) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
  if (digits.length <= 10) return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
  return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
}

// ---------- data de hoje nos elementos [data-today] ----------
// Ex.: "Sexta-feira, 9 de Outubro de 2026"
function initTodayLabel() {
  var els = document.querySelectorAll('[data-today]');
  if (!els.length) return;

  var partes = {};
  new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    .formatToParts(new Date())
    .forEach(function (p) { partes[p.type] = p.value; });

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  var texto = cap(partes.weekday) + ', ' + partes.day + ' de ' + cap(partes.month) + ' de ' + partes.year;

  els.forEach(function (el) { el.textContent = texto; });
}

// ---------- validação simples de campos obrigatórios ----------
function validateRequired(fields) {
  var isValid = true;
  fields.forEach(function (field) {
    if (!field) return;
    var value = (field.value || '').trim();

    // Segurança extra para <select>: se a primeira <option> não tem
    // atributo value (placeholder), o navegador usa o texto dela como valor.
    // Nesse caso, tratamos o placeholder como "vazio".
    if (field.tagName === 'SELECT' &&
        field.selectedIndex === 0 &&
        field.options.length &&
        !field.options[0].hasAttribute('value')) {
      value = '';
    }

    var wrap = field.closest('.field');
    if (!value) {
      isValid = false;
      field.classList.add('is-invalid');
      if (wrap) wrap.classList.add('grupo-campo-com-erro');
    } else {
      field.classList.remove('is-invalid');
      if (wrap) wrap.classList.remove('grupo-campo-com-erro');
    }
  });
  return isValid;
}

function clearErrorOnInput(field) {
  if (!field) return;
  var evt = field.tagName === 'SELECT' ? 'change' : 'input';
  field.addEventListener(evt, function () {
    field.classList.remove('is-invalid');
    var wrap = field.closest('.field');
    if (wrap) wrap.classList.remove('grupo-campo-com-erro');
  });
}

// ---------- navegação global: menu lateral, perfil e sair ----------
function initGlobalNav() {
  var openMenuBtn = document.querySelector('[data-open-menu]');
  var closeMenuBtn = document.querySelector('[data-close-menu]');
  var drawer = document.querySelector('[data-drawer]');
  var overlay = document.querySelector('[data-drawer-overlay]');

  function openDrawer() {
    if (drawer) drawer.classList.add('is-open');
    if (overlay) overlay.classList.add('is-open');
  }
  function closeDrawer() {
    if (drawer) drawer.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-open');
  }
  if (openMenuBtn) openMenuBtn.addEventListener('click', openDrawer);
  if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeDrawer);
  if (overlay) overlay.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeDrawer();
  });

  // popover de perfil
  var profileBtn = document.querySelector('[data-open-profile]');
  var profilePop = document.querySelector('[data-profile-pop]');
  if (profileBtn && profilePop) {
    var profileStorageKey = 'sweetlog-profile';
    var profileName = profilePop.querySelector('.profile-pop__info strong');
    var profileDetails = profilePop.querySelector('.profile-pop__info p');
    var profileAvatar = profilePop.querySelector('.profile-pop__avatar');
    var profileRow = profilePop.querySelector('.profile-pop__row');
    var logoutButton = profilePop.querySelector('.profile-pop__logout');
    var detailsLines = [];
    if (profileDetails) {
      var currentLine = '';
      Array.prototype.forEach.call(profileDetails.childNodes, function (node) {
        if (node.nodeName === 'BR') {
          detailsLines.push(currentLine.trim());
          currentLine = '';
        } else {
          currentLine += node.textContent;
        }
      });
      if (currentLine.trim()) detailsLines.push(currentLine.trim());
    }
    var initialProfile = {
      name: profileName ? profileName.textContent.trim() : '',
      phone: ''
    };
    var detailsText = detailsLines.join('\n');
    var phoneMatch = detailsText.match(/Telefone:\s*([\s\S]*)/);
    if (phoneMatch) initialProfile.phone = phoneMatch[1].trim();

    var profile = initialProfile;
    try {
      var savedProfile = localStorage.getItem(profileStorageKey);
      if (savedProfile) {
        var parsedProfile = JSON.parse(savedProfile);
        if (parsedProfile && typeof parsedProfile.name === 'string' &&
            typeof parsedProfile.phone === 'string') {
          profile = parsedProfile;
        } else {
          throw new Error('Dados de perfil inválidos.');
        }
      }
    } catch (error) {
      showToast('Não foi possível carregar os dados do perfil salvos neste navegador.', 'error');
    }

    function getInitials(name) {
      var parts = name.trim().split(/\s+/);
      if (!parts[0]) return '';
      return parts.length > 1
        ? (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toLocaleUpperCase('pt-BR')
        : parts[0].charAt(0).toLocaleUpperCase('pt-BR');
    }

    function renderProfile() {
      var initials = getInitials(profile.name);
      if (profileName) profileName.textContent = profile.name;
      if (profileAvatar) profileAvatar.textContent = initials;
      profileBtn.textContent = initials;
      profileBtn.setAttribute('aria-label', 'Abrir perfil de ' + profile.name);
      if (profileDetails) {
        var enrollmentMatch = detailsText.match(/Matrícula:\s*([^\n]+)/);
        var departmentMatch = detailsText.match(/Setor:\s*([^\n]+)/);
        var enrollment = enrollmentMatch ? enrollmentMatch[1].trim() : '';
        var department = departmentMatch ? departmentMatch[1].trim() : '';
        var phoneLine = document.createTextNode('Telefone: ' + profile.phone);
        profileDetails.replaceChildren(
          document.createTextNode('Matrícula: ' + enrollment),
          document.createElement('br'),
          document.createTextNode('Setor: ' + department),
          document.createElement('br'),
          phoneLine
        );
      }
    }

    var editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'profile-pop__edit';
    editButton.textContent = 'Editar perfil';
    var passwordLink = document.createElement('a');
    passwordLink.className = 'profile-pop__link';
    passwordLink.href = 'recuperar-senha.html';
    passwordLink.textContent = '🔒 Mudar senha';

    var editForm = document.createElement('form');
    editForm.className = 'profile-edit';
    editForm.hidden = true;
    editForm.innerHTML =
      '<label class="profile-edit__field">Nome completo' +
      '<input class="input" name="name" type="text" autocomplete="name" required></label>' +
      '<label class="profile-edit__field">Telefone' +
      '<input class="input" name="phone" type="tel" autocomplete="tel" placeholder="(11) 90000-0000" required></label>' +
      '<button class="btn btn--primary btn--block" type="submit">Salvar alterações</button>' +
      '<button class="btn btn--outline btn--block" type="button" data-profile-cancel>Cancelar</button>';
    profilePop.insertBefore(editForm, logoutButton);
    profilePop.insertBefore(editButton, logoutButton);
    profilePop.insertBefore(passwordLink, logoutButton);
    var nameInput = editForm.elements.namedItem('name');
    var phoneInput = editForm.elements.namedItem('phone');
    clearErrorOnInput(nameInput);
    clearErrorOnInput(phoneInput);

    function closeProfileEditor() {
      editForm.hidden = true;
      profileRow.hidden = false;
      editButton.hidden = false;
      passwordLink.hidden = false;
      logoutButton.hidden = false;
    }

    renderProfile();
    editButton.addEventListener('click', function () {
      nameInput.value = profile.name;
      phoneInput.value = profile.phone;
      profileRow.hidden = true;
      editButton.hidden = true;
      passwordLink.hidden = true;
      logoutButton.hidden = true;
      editForm.hidden = false;
      nameInput.focus();
    });
    editForm.querySelector('[data-profile-cancel]').addEventListener('click', closeProfileEditor);
    phoneInput.addEventListener('input', function () {
      phoneInput.value = formatPhone(phoneInput.value.replace(/\D/g, ''));
    });
    editForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var name = nameInput.value.trim().replace(/\s+/g, ' ');
      var digits = phoneInput.value.replace(/\D/g, '');
      if (!name) {
        nameInput.classList.add('is-invalid');
        showToast('Informe o nome do perfil.', 'error');
        return;
      }
      if (digits.length < 10 || digits.length > 11) {
        phoneInput.classList.add('is-invalid');
        showToast('Informe um telefone válido com DDD.', 'error');
        return;
      }

      var updatedProfile = { name: name, phone: formatPhone(digits) };
      try {
        localStorage.setItem(profileStorageKey, JSON.stringify(updatedProfile));
      } catch (error) {
        showToast('Não foi possível salvar o perfil neste navegador.', 'error');
        return;
      }
      profile = updatedProfile;
      renderProfile();
      closeProfileEditor();
      profilePop.classList.remove('is-open');
      showToast('Perfil atualizado com sucesso.', 'success');
    });

    profileBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      profilePop.classList.toggle('is-open');
    });
    document.addEventListener('click', function (e) {
      if (!profilePop.contains(e.target) && e.target !== profileBtn) {
        profilePop.classList.remove('is-open');
      }
    });
  }

  // sair da conta (drawer e popover de perfil)
  document.querySelectorAll(
    '.profile-pop__logout, .perfil-pop-sair, .menu-lateral-sair, .drawer__logout'
  ).forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (confirm('Deseja realmente sair da sua conta?')) {
        window.location.href = 'login.html';
      }
    });
  });

}

// ---------- menu: garante o item "Funcionários e Matrículas" em todas as páginas ----------
// Se a página já tem um item equivalente no HTML (pelo endereço OU pelo texto,
// qualquer que seja o nome do arquivo), não faz nada: nunca duplica.
function initDrawerFuncionarios() {
  var nav = document.querySelector('.drawer__nav');
  if (!nav) return;

  var jaExiste = Array.prototype.slice.call(nav.querySelectorAll('a')).some(function (a) {
    var href = (a.getAttribute('href') || '').toLowerCase();
    var texto = (a.textContent || '').toLowerCase();
    return href.indexOf('funcionario') > -1 || href.indexOf('matricula') > -1 ||
      texto.indexOf('funcionários') > -1 || texto.indexOf('funcionarios') > -1;
  });
  if (jaExiste) return;

  var path = window.location.pathname;
  var ativo = /funcionariosMatricula|nova-matricula|novo-funcionario/.test(path);

  var link = document.createElement('a');
  link.className = 'drawer__link' + (ativo ? ' is-active' : '');
  link.href = 'funcionariosMatricula.html';
  if (ativo) link.setAttribute('aria-current', 'page');
  link.innerHTML = '<span class="ico" aria-hidden="true">👥</span> Funcionários e Matrículas';
  nav.appendChild(link);
}

// ---------- busca do topo em telas sem lista própria ----------
// Nas telas com lista (produtos, pedidos, lotes) o campo do topo filtra a lista.
// Nas demais, avisa que a busca geral ainda não existe em vez de não fazer nada.
function initTopbarSearch() {
  document.querySelectorAll('.topbar__search input').forEach(function (input) {
    if (input.hasAttribute('data-produto-search') ||
        input.hasAttribute('data-pedido-search') ||
        input.hasAttribute('data-lote-search')) return;
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        showToast('A busca geral ainda está em desenvolvimento.', 'info');
      }
    });
  });
}

// ---------- links/placeholders ainda não implementados (href="#") ----------
function initPlaceholderLinks() {
  document.querySelectorAll('a[href="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (link.textContent.indexOf('Reenviar') > -1) {
        showToast('Um novo código foi enviado para o seu telefone.', 'success');
      } else {
        showToast('Funcionalidade em desenvolvimento.', 'info');
      }
    });
  });
}

// ---------- login.html ----------
function initLoginForm() {
  var form = document.querySelector('[data-login-form]');
  if (!form) return;

  var matricula = document.getElementById('matricula');
  var senha = document.getElementById('senha');
  [matricula, senha].forEach(clearErrorOnInput);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var isValid = validateRequired([matricula, senha]);
    if (!isValid) {
      showToast('Informe matrícula e senha para continuar.', 'error');
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Entrando...';

    setTimeout(function () {
      window.location.href = 'dashboard.html';
    }, 500);
  });
}

// ---------- verificar-codigo.html ----------
// O formulário precisa ter data-codigo-form (ou a página se chamar verificar-codigo).
// Aceita um campo único ou vários campos (uma caixinha por dígito).
// Se o botão "Verificar" ainda for um <a href> DENTRO do <form>, ele passa a
// enviar o formulário em vez de navegar direto.
function initVerificarCodigo() {
  var form = document.querySelector('[data-codigo-form]') ||
    (/verificar-codigo/.test(window.location.pathname) ? document.querySelector('form') : null);
  if (!form) return;

  var inputs = Array.prototype.slice.call(
    form.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"])')
  );
  inputs.forEach(clearErrorOnInput);

  // várias caixinhas (uma por dígito): só números, avança sozinho, aceita colar o código
  if (inputs.length > 1) {
    inputs.forEach(function (input, index) {
      input.addEventListener('input', function () {
        input.value = input.value.replace(/\D/g, '').slice(0, 1);
        if (input.value && inputs[index + 1]) inputs[index + 1].focus();
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !input.value && inputs[index - 1]) {
          inputs[index - 1].focus();
        }
      });
      input.addEventListener('paste', function (e) {
        var clip = e.clipboardData || window.clipboardData;
        var colado = ((clip && clip.getData('text')) || '').replace(/\D/g, '');
        if (!colado) return;
        e.preventDefault();
        colado.slice(0, inputs.length - index).split('').forEach(function (digito, i) {
          inputs[index + i].value = digito;
        });
        inputs.forEach(function (i) { i.classList.remove('is-invalid'); });
        inputs[Math.min(index + colado.length, inputs.length - 1)].focus();
      });
    });
  }

  function markInvalid() {
    inputs.forEach(function (input) {
      input.classList.add('is-invalid');
      var wrap = input.closest('.field');
      if (wrap) wrap.classList.add('field--error');
    });
  }

  function validate() {
    var preenchidos = validateRequired(inputs);
    var codigo = inputs.map(function (i) { return i.value.trim(); }).join('');
    if (!preenchidos || !/^\d{6}$/.test(codigo)) {
      markInvalid();
      showToast('Informe o código de 6 dígitos enviado para o seu telefone.', 'error');
      return false;
    }
    return true;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!validate()) return;
    window.location.href = 'nova-senha.html';
  });

  // botão feito com <a href> dentro do formulário
  form.querySelectorAll('a[href]:not([href="#"])').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (validate()) window.location.href = 'nova-senha.html';
    });
  });
}

// ---------- recuperar-senha.html ----------
// O formulário precisa ter data-recuperar-form (ou a página se chamar recuperar-senha).
function initRecuperarSenha() {
  var form = document.querySelector('[data-recuperar-form]') ||
    (/recuperar-senha/.test(window.location.pathname) ? document.querySelector('form') : null);
  if (!form) return;

  var telefone = form.querySelector('input[type="tel"]');
  if (!telefone) return;
  clearErrorOnInput(telefone);

  telefone.addEventListener('input', function () {
    telefone.value = formatPhone(telefone.value.replace(/\D/g, ''));
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var digitos = telefone.value.replace(/\D/g, '');
    if (!validateRequired([telefone]) || digitos.length < 10 || digitos.length > 11) {
      telefone.classList.add('is-invalid');
      var wrap = telefone.closest('.field');
      if (wrap) wrap.classList.add('field--error');
      showToast('Informe um telefone válido com DDD.', 'error');
      return;
    }
    window.location.href = 'verificar-codigo.html';
  });
}

// ---------- nova-senha.html ----------
// O formulário precisa ter data-senha-form (ou a página se chamar nova-senha).
// Usa os dois primeiros campos de senha do formulário: nova senha e confirmação.
function initNovaSenha() {
  var form = document.querySelector('[data-senha-form]') ||
    (/nova-senha/.test(window.location.pathname) ? document.querySelector('form') : null);
  if (!form) return;

  var campos = form.querySelectorAll('input[type="password"]');
  var senha = campos[0];
  var confirmar = campos[1];
  if (!senha) return;
  [senha, confirmar].forEach(clearErrorOnInput);

  function validate() {
    if (!validateRequired([senha, confirmar])) {
      showToast('Preencha a nova senha e a confirmação.', 'error');
      return false;
    }
    if (senha.value.length < 8) {
      senha.classList.add('is-invalid');
      showToast('A senha deve ter no mínimo 8 caracteres.', 'error');
      return false;
    }
    if (confirmar && senha.value !== confirmar.value) {
      confirmar.classList.add('is-invalid');
      showToast('As senhas não coincidem.', 'error');
      return false;
    }
    return true;
  }

  function concluir() {
    showToast('Senha alterada com sucesso!', 'success');
    redirectAfterToast('login.html');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (validate()) concluir();
  });

  // botão feito com <a href> dentro do formulário
  form.querySelectorAll('a[href]:not([href="#"])').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      if (validate()) concluir();
    });
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initGlobalNav();
  initDrawerFuncionarios();
  initTopbarSearch();
  initPlaceholderLinks();
  initProductDetailEdit();
  initSalesEditing();
  initLoginForm();
  initRecuperarSenha();
  initVerificarCodigo();
  initNovaSenha();
  initTodayLabel();
});

function initProductDetailEdit() {
  var form = document.querySelector('[data-product-detail-form]');
  if (!form) return;

  var editButton = document.querySelector('[data-edit-product]');
  var actions = form.querySelector('[data-detail-actions]');
  var inputs = Array.prototype.slice.call(form.querySelectorAll('[data-detail-input]'));
  var storageKey = 'sweetlog-produto-detalhe';

  function setEditing(isEditing) {
    inputs.forEach(function (input) {
      var value = form.querySelector('[data-detail-value="' + input.dataset.detailInput + '"]');
      input.style.display = isEditing ? '' : 'none';
      value.style.display = isEditing ? 'none' : '';
    });
    actions.style.display = isEditing ? 'flex' : 'none';
    editButton.style.display = isEditing ? 'none' : '';
  }

  function applyValues(values) {
    inputs.forEach(function (input) {
      var value = form.querySelector('[data-detail-value="' + input.dataset.detailInput + '"]');
      input.value = values[input.dataset.detailInput];
      value.textContent = input.value;
    });
  }

  try {
    var storedValues = localStorage.getItem(storageKey);
    if (storedValues) {
      var values = JSON.parse(storedValues);
      var validValues = inputs.every(function (input) {
        return typeof values[input.dataset.detailInput] === 'string';
      });
      if (!validValues) throw new Error('Os dados salvos do produto são inválidos.');
      applyValues(values);
    }
  } catch (error) {
    showToast('Não foi possível carregar as alterações salvas do produto.', 'error');
  }

  editButton.addEventListener('click', function () {
    setEditing(true);
  });

  form.querySelector('[data-cancel-detail]').addEventListener('click', function () {
    inputs.forEach(function (input) {
      var value = form.querySelector('[data-detail-value="' + input.dataset.detailInput + '"]');
      input.value = value.textContent;
      input.classList.remove('is-invalid');
    });
    setEditing(false);
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var values = {};
    var isValid = true;

    inputs.forEach(function (input) {
      var value = input.value.trim();
      if (!value) {
        input.classList.add('is-invalid');
        isValid = false;
      } else {
        input.classList.remove('is-invalid');
        values[input.dataset.detailInput] = value;
      }
    });

    if (!isValid) {
      showToast('Preencha todos os campos antes de salvar.', 'error');
      return;
    }

    try {
      localStorage.setItem(storageKey, JSON.stringify(values));
    } catch (error) {
      showToast('Não foi possível salvar as alterações do produto.', 'error');
      return;
    }

    applyValues(values);
    setEditing(false);
    showToast('Alterações do produto salvas com sucesso!', 'success');
  });
}

function initSalesEditing() {
  var cards = Array.prototype.slice.call(document.querySelectorAll('[data-sale-card]'));
  if (!cards.length) return;

  var storageKey = 'sweetlog-vendas';
  var fields = ['status', 'buyer', 'quantity', 'amount', 'orderDate', 'deliveryDate'];
  var invoiceDataBySale = {};
  var statusClasses = {
    'Em preparo': 'badge--purple',
    'Aguardando coleta': 'badge--blue',
    Entregue: 'badge--success',
    Cancelado: 'badge--danger'
  };

  function formatDate(value) {
    var date = new Date(value + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  }

  function getValues(card) {
    var values = {};
    fields.forEach(function (field) {
      values[field] = card.querySelector('[data-sale-input="' + field + '"]').value;
    });
    return values;
  }

  function isValidSale(values) {
    var quantity = Number(values.quantity);
    var amount = Number(values.amount);
    return Number.isInteger(quantity) && quantity > 0 &&
      values.quantity.trim() !== '' && values.amount.trim() !== '' &&
      values.buyer.trim() !== '' &&
      Number.isFinite(amount) && amount >= 0 &&
      !!statusClasses[values.status] &&
      /^\d{4}-\d{2}-\d{2}$/.test(values.orderDate) &&
      (!values.deliveryDate ||
        (/^\d{4}-\d{2}-\d{2}$/.test(values.deliveryDate) &&
          values.deliveryDate >= values.orderDate));
  }

  function applyValues(card, values) {
    fields.forEach(function (field) {
      var input = card.querySelector('[data-sale-input="' + field + '"]');
      var output = card.querySelector('[data-sale-value="' + field + '"]');
      input.value = values[field];

      if (field === 'quantity') output.textContent = values[field] + ' un';
      else if (field === 'buyer') output.textContent = values[field];
      else if (field === 'amount') {
        output.textContent = new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        }).format(Number(values[field]));
      } else if (field === 'orderDate' || field === 'deliveryDate') {
        output.textContent = values[field] ? formatDate(values[field]) : '';
        if (field === 'deliveryDate') {
          output.closest('[data-sale-delivery]').style.display =
            values[field] ? '' : 'none';
        }
      } else {
        output.textContent = values[field];
        Object.keys(statusClasses).forEach(function (status) {
          output.classList.remove(statusClasses[status]);
        });
        output.classList.add(statusClasses[values[field]]);
      }
    });
  }

  function makeInvoicePdf(card, values) {
    function pdfText(value) {
      return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7E]/g, '').replace(/([\\()])/g, '\\$1');
    }
    var lines = [
      'NOTA FISCAL - DEMONSTRACAO, SEM VALOR FISCAL',
      'SweetLog - Resumo de venda',
      'Pedido: ' + card.dataset.numero,
      'Comprador: ' + values.buyer,
      'Quantidade: ' + values.quantity + ' unidades',
      'Valor total: R$ ' + Number(values.amount).toFixed(2),
      'Data do pedido: ' + formatDate(values.orderDate),
      'Data de entrega: ' + (values.deliveryDate ? formatDate(values.deliveryDate) : 'Nao informada')
    ];
    var commands = ['BT', '/F1 12 Tf', '50 750 Td'];
    lines.forEach(function (line, index) {
      if (index) commands.push('0 -24 Td');
      commands.push('(' + pdfText(line) + ') Tj');
    });
    commands.push('ET');

    var stream = commands.join('\n');
    var objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream'
    ];
    var pdf = '%PDF-1.4\n';
    var offsets = [0];
    objects.forEach(function (object, index) {
      offsets.push(pdf.length);
      pdf += (index + 1) + ' 0 obj\n' + object + '\nendobj\n';
    });
    var xrefOffset = pdf.length;
    pdf += 'xref\n0 ' + (objects.length + 1) + '\n0000000000 65535 f \n';
    offsets.slice(1).forEach(function (offset) {
      pdf += String(offset).padStart(10, '0') + ' 00000 n \n';
    });
    pdf += 'trailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' +
      xrefOffset + '\n%%EOF';
    return new Blob([pdf], { type: 'application/pdf' });
  }

  function downloadInvoice(card) {
    var values = getValues(card);
    var invoiceData = invoiceDataBySale[card.dataset.numero];
    var blob;

    if (invoiceData) {
      var parts = invoiceData.split(',');
      var binary = atob(parts[1]);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      blob = new Blob([bytes], { type: 'application/pdf' });
    } else {
      blob = makeInvoicePdf(card, values);
    }

    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = (invoiceData ? 'nota-fiscal-' : 'nota-fiscal-demonstracao-') +
      card.dataset.numero + '.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function setEditing(card, isEditing) {
    var deliveryInput = card.querySelector('[data-sale-input="deliveryDate"]');
    var deliveryContainer = card.querySelector('[data-sale-delivery]');
    deliveryContainer.style.display = isEditing || deliveryInput.value ? '' : 'none';
    card.querySelectorAll('[data-sale-input]').forEach(function (input) {
      input.disabled = !isEditing;
      input.style.display = isEditing ? '' : 'none';
    });
    var invoiceInput = card.querySelector('[data-sale-invoice]');
    invoiceInput.disabled = !isEditing;
    invoiceInput.required = isEditing;
    invoiceInput.style.display = isEditing ? '' : 'none';
    card.querySelector('[data-sale-download]').style.display = isEditing ? 'none' : '';
    card.querySelector('[data-sale-invoice-name]').style.display = isEditing ? '' : 'none';
    card.querySelectorAll('[data-sale-value]').forEach(function (value) {
      value.style.display = isEditing ? 'none' : '';
    });
    card.querySelector('[data-sale-actions]').style.display = isEditing ? 'flex' : 'none';
    card.querySelector('[data-sale-edit]').style.display = isEditing ? 'none' : '';
  }

  function updateActiveCount() {
    var count = cards.filter(function (card) {
      var status = card.querySelector('[data-sale-value="status"]').textContent;
      return status !== 'Entregue' && status !== 'Cancelado';
    }).length;
    var countBadge = document.querySelector('[data-sales-count]');
    if (countBadge) countBadge.textContent = '🧺 ' + count + ' Ativas';
  }

  try {
    var stored = localStorage.getItem(storageKey);
    if (stored) {
      var savedSales = JSON.parse(stored);
      if (!savedSales || typeof savedSales !== 'object' || Array.isArray(savedSales)) {
        throw new Error('Os dados salvos das vendas são inválidos.');
      }
      cards.forEach(function (card) {
        var sale = savedSales[card.dataset.numero];
        if (!sale) return;
        var defaults = getValues(card);
        var migratedSale = Object.assign({}, defaults, sale);
        var validSale = fields.every(function (field) {
          return typeof migratedSale[field] === 'string';
        }) && isValidSale(migratedSale) &&
          (!sale.invoiceDataUrl || /^data:application\/pdf;base64,/.test(sale.invoiceDataUrl));
        if (!validSale) {
          showToast('Há alterações salvas inválidas na venda ' + card.dataset.numero + '.', 'error');
          return;
        }
        applyValues(card, migratedSale);
        if (sale.invoiceDataUrl) invoiceDataBySale[card.dataset.numero] = sale.invoiceDataUrl;
      });
    }
  } catch (error) {
    showToast('Não foi possível carregar as alterações salvas das vendas.', 'error');
  }

  cards.forEach(function (card) {
    var editButton = card.querySelector('[data-sale-edit]');
    var cancelButton = card.querySelector('[data-sale-cancel]');
    var originalValues;
    var invoiceInput = card.querySelector('[data-sale-invoice]');
    var invoiceName = card.querySelector('[data-sale-invoice-name]');

    setEditing(card, false);
    invoiceName.style.display = 'none';

    invoiceInput.addEventListener('change', function () {
      var file = invoiceInput.files[0];
      if (!file) return;
      if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) {
        showToast('Selecione uma nota fiscal em formato PDF.', 'error');
        invoiceInput.value = '';
        invoiceName.textContent = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast('A nota fiscal deve ter no máximo 2MB.', 'error');
        invoiceInput.value = '';
        invoiceName.textContent = '';
        return;
      }
      invoiceName.textContent = file.name;
    });

    card.querySelector('[data-sale-download]').addEventListener('click', function (event) {
      event.preventDefault();
      downloadInvoice(card);
    });

    editButton.addEventListener('click', function () {
      originalValues = getValues(card);
      invoiceInput.value = '';
      invoiceName.textContent = '';
      setEditing(card, true);
    });

    cancelButton.addEventListener('click', function () {
      applyValues(card, originalValues);
      invoiceInput.value = '';
      invoiceName.textContent = '';
      setEditing(card, false);
    });

    card.addEventListener('submit', function (event) {
      event.preventDefault();
      var values = getValues(card);
      var invoiceFile = invoiceInput.files[0];
      if (!values.buyer.trim()) {
        showToast('Informe o comprador da venda.', 'error');
        card.querySelector('[data-sale-input="buyer"]').focus();
        return;
      }
      if (!invoiceFile) {
        showToast('Anexe a nota fiscal em PDF antes de salvar.', 'error');
        invoiceInput.focus();
        return;
      }
      if (!isValidSale(values)) {
        showToast('Confira a quantidade, o valor, o status e as datas da venda.', 'error');
        return;
      }

      var reader = new FileReader();
      reader.onerror = function () {
        showToast('Não foi possível verificar a nota fiscal selecionada.', 'error');
      };
      reader.onload = function () {
        var signature = new Uint8Array(reader.result);
        if (signature.length < 5 || signature[0] !== 37 || signature[1] !== 80 ||
            signature[2] !== 68 || signature[3] !== 70 || signature[4] !== 45) {
          showToast('O arquivo selecionado não contém um documento PDF válido.', 'error');
          return;
        }

        var dataReader = new FileReader();
        dataReader.onerror = function () {
          showToast('Não foi possível ler a nota fiscal selecionada.', 'error');
        };
        dataReader.onload = function () {
          var invoiceDataUrl = dataReader.result;
          try {
            var savedSales = JSON.parse(localStorage.getItem(storageKey) || '{}');
            savedSales[card.dataset.numero] = Object.assign({}, values, {
              invoiceDataUrl: invoiceDataUrl
            });
            localStorage.setItem(storageKey, JSON.stringify(savedSales));
          } catch (error) {
            showToast('Não foi possível salvar os dados e a nota fiscal desta venda.', 'error');
            return;
          }

          invoiceDataBySale[card.dataset.numero] = invoiceDataUrl;
          applyValues(card, values);
          invoiceInput.value = '';
          invoiceName.textContent = '';
          setEditing(card, false);
          updateActiveCount();
          showToast('Venda ' + card.dataset.numero + ' atualizada com sucesso!', 'success');
        };
        dataReader.readAsDataURL(invoiceFile);
      };
      reader.readAsArrayBuffer(invoiceFile.slice(0, 5));
    });
  });

  updateActiveCount();
}

// produto-cadastrar.js
document.addEventListener('DOMContentLoaded', function () {
  var form = document.querySelector('[data-produto-form]');
  if (!form) return;

  var uploadBox = document.querySelector('[data-upload-box]');
  var uploadInput = document.querySelector('[data-upload-input]');
  var preview = document.querySelector('[data-upload-preview]');
  var icon = document.querySelector('[data-upload-icon]');
  var text = document.querySelector('[data-upload-text]');
  var hint = document.querySelector('[data-upload-hint]');

  var nome = document.getElementById('nome');
  var marca = document.getElementById('marca');
  var tamanho = document.getElementById('tamanho');
  [nome, marca, tamanho].forEach(clearErrorOnInput);

  function showPreview(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Selecione um arquivo de imagem válido.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('A imagem deve ter no máximo 5MB.', 'error');
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      preview.src = e.target.result;
      preview.hidden = false;
      icon.hidden = true;
      text.textContent = file.name;
      hint.textContent = 'Clique para trocar a imagem';
    };
    reader.readAsDataURL(file);
  }

  if (uploadInput) {
    uploadInput.addEventListener('change', function () {
      if (uploadInput.files[0]) showPreview(uploadInput.files[0]);
    });
  }

  if (uploadBox) {
    ['dragenter', 'dragover'].forEach(function (evt) {
      uploadBox.addEventListener(evt, function (e) {
        e.preventDefault();
        uploadBox.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      uploadBox.addEventListener(evt, function (e) {
        e.preventDefault();
        uploadBox.classList.remove('is-dragover');
      });
    });
    uploadBox.addEventListener('drop', function (e) {
      var file = e.dataTransfer.files[0];
      if (file) {
        uploadInput.files = e.dataTransfer.files;
        showPreview(file);
      }
    });
  }

  var cancelBtn = document.querySelector('[data-cancel-btn]');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function () {
      if (confirm('Descartar os dados preenchidos e voltar para a lista de produtos?')) {
        window.location.href = 'produtos-lista.html';
      }
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var isValid = validateRequired([nome, marca, tamanho]);
    if (!isValid) {
      showToast('Preencha os campos obrigatórios do produto.', 'error');
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Cadastrando...';

    setTimeout(function () {
      showToast('Produto "' + nome.value + '" cadastrado com sucesso!', 'success');
      redirectAfterToast('produtos-lista.html');
    }, 700);
  });
});

// estoque-form.js — stepper de quantidade, upload de nota fiscal,
// máscara de valor e validação para as telas de entrada/saída de estoque

document.addEventListener('DOMContentLoaded', function () {
  initStepper();
  initUploadBox();
  initCurrencyInput();
  initCancelButton();
  initEntradaForm();
  initSaidaForm();
});

// ---------- stepper (+ / -) ----------
function initStepper() {
  document.querySelectorAll('[data-stepper]').forEach(function (stepper) {
    var value = stepper.querySelector('[data-stepper-value]');
    var minus = stepper.querySelector('[data-stepper-minus]');
    var plus = stepper.querySelector('[data-stepper-plus]');
    if (!value || !minus || !plus) return;

    function getValue() { return parseInt(value.value, 10) || 1; }
    function setValue(n) { value.value = Math.max(1, n); }

    minus.addEventListener('click', function () { setValue(getValue() - 1); });
    plus.addEventListener('click', function () { setValue(getValue() + 1); });
    value.addEventListener('input', function () {
      value.value = value.value.replace(/\D/g, '');
    });
    value.addEventListener('blur', function () { setValue(getValue()); });
  });
}

// ---------- upload de arquivo (nota fiscal) ----------
function initUploadBox() {
  document.querySelectorAll('[data-upload-box]').forEach(function (box) {
    // o upload de imagem do cadastro de produto tem tratamento próprio
    if (box.closest('[data-produto-form]')) return;

    var input = box.querySelector('[data-upload-input]');
    var text = box.querySelector('[data-upload-text]');
    var hint = box.querySelector('[data-upload-hint]');
    if (!input) return;

    input.addEventListener('change', function () {
      var file = input.files[0];
      if (!file) return;
      if (input.accept.indexOf('pdf') > -1 && file.type !== 'application/pdf') {
        showToast('Anexe um arquivo em PDF.', 'error');
        input.value = '';
        return;
      }
      var maxMb = parseFloat(input.getAttribute('data-max-mb')) || 0;
      if (maxMb && file.size > maxMb * 1024 * 1024) {
        showToast('O arquivo deve ter no máximo ' + maxMb + 'MB.', 'error');
        input.value = '';
        return;
      }
      if (text) text.textContent = file.name;
      if (hint) hint.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB anexado';
      box.classList.add('is-filled');
    });

    ['dragenter', 'dragover'].forEach(function (evt) {
      box.addEventListener(evt, function (e) { e.preventDefault(); box.classList.add('is-dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      box.addEventListener(evt, function (e) { e.preventDefault(); box.classList.remove('is-dragover'); });
    });
    box.addEventListener('drop', function (e) {
      if (e.dataTransfer.files[0]) {
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change'));
      }
    });
  });
}

// ---------- máscara simples de valor em R$ ----------
function initCurrencyInput() {
  document.querySelectorAll('[data-currency-input]').forEach(function (input) {
    input.addEventListener('input', function () {
      var digits = input.value.replace(/\D/g, '');
      if (!digits) { input.value = ''; return; }
      var cents = (parseInt(digits, 10) / 100).toFixed(2);
      input.value = 'R$ ' + cents.replace('.', ',').replace(/(\d)(?=(\d{3})+,)/g, '$1.');
    });
  });
}

// ---------- botão cancelar com confirmação ----------
function initCancelButton() {
  var btn = document.querySelector('[data-cancel-btn]');
  if (!btn) return;
  // já tratado à parte na tela de cadastro de produto (confirmação com texto próprio)
  if (document.querySelector('[data-produto-form]')) return;
  btn.addEventListener('click', function () {
    if (confirm('Deseja cancelar e descartar esta operação?')) {
      window.location.href = btn.getAttribute('data-cancel-href') || 'estoque.html';
    }
  });
}

// ---------- validação: entrada de produtos ----------
function initEntradaForm() {
  var form = document.querySelector('[data-entrada-form]');
  if (!form) return;

  var produto = document.getElementById('produto');
  var quantidade = document.getElementById('qtd');
  var lote = document.getElementById('lote');
  var validade = document.getElementById('validade');
  [produto, quantidade, lote, validade].forEach(clearErrorOnInput);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var isValid = validateRequired([produto, quantidade, lote, validade]);
    var quantidadeInformada = Number(quantidade && quantidade.value);
    if (quantidade && quantidade.value &&
        (!Number.isInteger(quantidadeInformada) || quantidadeInformada < 1)) {
      quantidade.classList.add('is-invalid');
      showToast('Informe uma quantidade válida (mínimo de 1).', 'error');
      isValid = false;
    }

    var nf = document.getElementById('nf');
    if (nf && !nf.files.length) {
      showToast('Anexe a nota fiscal em PDF.', 'error');
      isValid = false;
    }

    // se nenhuma opção de inspeção estiver marcada, não quebra o envio
    var inspecao = form.querySelector('input[name="inspecao"]:checked');
    var reprovado = !!inspecao && inspecao.value === 'reprovado';
    if (reprovado) {
      showToast('Produto reprovado na inspeção — a entrada não pode ser registrada.', 'error');
      isValid = false;
    }
    if (!isValid) return;

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Registrando...';

    setTimeout(function () {
      showToast('Entrada de produto registrada com sucesso!', 'success');
      redirectAfterToast('estoque.html');
    }, 700);
  });
}

// ---------- validação: saída de produtos ----------
function initSaidaForm() {
  var form = document.querySelector('[data-saida-form]');
  if (!form) return;

  var produto2 = document.getElementById('produto2');
  var motivo = document.getElementById('motivo');
  var quantidade = document.getElementById('qtd2');
  [produto2, motivo, quantidade].forEach(clearErrorOnInput);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var isValid = validateRequired([produto2, motivo, quantidade]);
    var quantidadeInformada = Number(quantidade && quantidade.value);
    if (quantidade && quantidade.value &&
        (!Number.isInteger(quantidadeInformada) || quantidadeInformada < 1)) {
      quantidade.classList.add('is-invalid');
      showToast('Informe uma quantidade válida (mínimo de 1).', 'error');
      isValid = false;
    }
    if (!isValid) {
      if (!produto2.value || !motivo.value) {
        showToast('Selecione o produto e o motivo da saída.', 'error');
      } else if (!quantidade.value) {
        showToast('Informe a quantidade da saída.', 'error');
      }
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Registrando...';

    setTimeout(function () {
      showToast('Saída de produto registrada com sucesso!', 'success');
      redirectAfterToast('estoque.html');
    }, 700);
  });
}

// produtos-lista.js — busca ao vivo + ordenação do catálogo
document.addEventListener('DOMContentLoaded', function () {
  var grid = document.querySelector('[data-product-grid]');
  if (!grid) return;

  var searchInputs = Array.prototype.slice.call(document.querySelectorAll('[data-produto-search]'));
  var emptyState = document.querySelector('[data-empty-state]');
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.product-card'));

  function applySearch(value) {
    var term = (value || '').trim().toLowerCase();
    var visibleCount = 0;

    cards.forEach(function (card) {
      var nome = (card.getAttribute('data-nome') || '').toLowerCase();
      var matches = nome.indexOf(term) > -1;
      card.style.display = matches ? '' : 'none';
      if (matches) visibleCount++;
    });

    if (emptyState) emptyState.hidden = visibleCount > 0;
  }

  // a busca do topo e a da página ficam sincronizadas
  searchInputs.forEach(function (input) {
    input.addEventListener('input', function () {
      searchInputs.forEach(function (other) {
        if (other !== input) other.value = input.value;
      });
      applySearch(input.value);
    });
  });

  // ---------- menu de ordenação ----------
  var sortToggle = document.querySelector('[data-sort-toggle]');
  var sortMenu = document.querySelector('[data-sort-menu]');

  if (sortToggle && sortMenu) {
    sortToggle.addEventListener('click', function (e) {
      e.stopPropagation();
      sortMenu.classList.toggle('is-open');
    });
    document.addEventListener('click', function (e) {
      if (!sortMenu.contains(e.target) && e.target !== sortToggle) {
        sortMenu.classList.remove('is-open');
      }
    });

    sortMenu.querySelectorAll('[data-sort]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var mode = btn.getAttribute('data-sort');
        var sorted = cards.slice().sort(function (a, b) {
          if (mode === 'nome-asc') return a.dataset.nome.localeCompare(b.dataset.nome);
          if (mode === 'nome-desc') return b.dataset.nome.localeCompare(a.dataset.nome);
          if (mode === 'qtd-desc') return (b.dataset.qtd - a.dataset.qtd);
          if (mode === 'qtd-asc') return (a.dataset.qtd - b.dataset.qtd);
          return 0;
        });
        sorted.forEach(function (card) { grid.appendChild(card); });
        sortToggle.textContent = btn.textContent + ' ▾';
        sortMenu.classList.remove('is-open');
      });
    });
  }
});

// pedidos.js — busca ao vivo por número do pedido
// Aceita mais de um campo [data-pedido-search] (ex.: um na barra do topo
// para desktop e outro dentro da página para o celular); eles ficam sincronizados.
// Se o HTML não tiver [data-empty-state], a mensagem de "nada encontrado" é criada aqui.
document.addEventListener('DOMContentLoaded', function () {
  var grid = document.querySelector('[data-order-grid]');
  var inputs = Array.prototype.slice.call(document.querySelectorAll('[data-pedido-search]'));
  if (!grid || !inputs.length) return;

  var emptyState = document.querySelector('[data-empty-state]');
  if (!emptyState) {
    emptyState = document.createElement('p');
    emptyState.setAttribute('data-empty-state', '');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'Nenhum pedido encontrado.';
    emptyState.hidden = true;
    grid.parentNode.insertBefore(emptyState, grid.nextSibling);
  }

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.order-card'));

  function applySearch(term) {
    term = term.trim().toLowerCase().replace(/^#/, '');
    var visibleCount = 0;

    cards.forEach(function (card) {
      var numero = (card.getAttribute('data-numero') || '').toLowerCase();
      var matches = numero.indexOf(term) > -1;
      card.style.display = matches ? '' : 'none';
      if (matches) visibleCount++;
    });

    emptyState.hidden = visibleCount > 0;
  }

  inputs.forEach(function (input) {
    input.addEventListener('input', function () {
      inputs.forEach(function (other) {
        if (other !== input) other.value = input.value;
      });
      applySearch(input.value);
    });
  });
});

// saldo.js — exportar relatório (feedback) + alternância de gráfico
document.addEventListener('DOMContentLoaded', function () {
  var exportBtn = document.querySelector('[data-export-btn]');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      var original = exportBtn.innerHTML;
      exportBtn.disabled = true;
      exportBtn.innerHTML = 'Gerando...';

      setTimeout(function () {
        exportBtn.innerHTML = original;
        exportBtn.disabled = false;
        var hoje = new Date().toLocaleDateString('pt-BR');
        showToast('Relatório de ' + hoje + ' exportado com sucesso!', 'success');
      }, 900);
    });
  }

  var toggle = document.querySelector('[data-chart-toggle]');
  var bars = document.querySelectorAll('[data-chart-bars] span');
  if (toggle && bars.length) {
    toggle.querySelectorAll('button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggle.querySelectorAll('button').forEach(function (b) { b.classList.remove('is-active'); });
        btn.classList.add('is-active');

        var mode = btn.getAttribute('data-chart-mode'); // receitas | despesas
        bars.forEach(function (bar) {
          var value = bar.getAttribute('data-' + mode);
          bar.style.height = (value || 0) + '%';
        });
      });
    });
  }
});

// lotes.js — busca, filtro por status e paginação (demonstração) da tela de lotes
document.addEventListener('DOMContentLoaded', function () {
  var table = document.querySelector('[data-lotes-table]');
  if (!table) return;

  var rows = Array.prototype.slice.call(table.querySelectorAll('tbody tr'));

  // ---------- busca por produto/insumo ----------
  // Aceita mais de um campo [data-lote-search] (topo da página e dentro da tabela);
  // os campos ficam sincronizados.
  var searchToggle = document.querySelector('[data-lote-search-toggle]');
  var searchWrap = document.querySelector('[data-lote-search-wrap]');
  var searchInputs = Array.prototype.slice.call(document.querySelectorAll('[data-lote-search]'));
  var searchTerm = '';

  if (searchToggle && searchWrap) {
    searchToggle.addEventListener('click', function () {
      searchWrap.hidden = !searchWrap.hidden;
      var inner = searchWrap.querySelector('[data-lote-search]');
      if (!searchWrap.hidden && inner) inner.focus();
    });
  }

  searchInputs.forEach(function (input) {
    input.addEventListener('input', function () {
      searchTerm = input.value.trim().toLowerCase();
      searchInputs.forEach(function (other) {
        if (other !== input) other.value = input.value;
      });
      applyFilters();
    });
  });

  // ---------- filtro por status ----------
  var filtrosBtn = document.querySelector('[data-lote-filtros-toggle]');
  var filtrosPanel = document.querySelector('[data-lote-filtros]');
  var activeStatus = 'todos';

  if (filtrosBtn && filtrosPanel) {
    filtrosBtn.addEventListener('click', function () {
      filtrosPanel.hidden = !filtrosPanel.hidden;
    });
    filtrosPanel.querySelectorAll('[data-lote-filter]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        filtrosPanel.querySelectorAll('[data-lote-filter]').forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        activeStatus = chip.getAttribute('data-lote-filter');
        applyFilters();
      });
    });
  }

  function applyFilters() {
    var term = searchTerm;
    var visible = 0;
    rows.forEach(function (row) {
      var title = (row.querySelector('.lotes-table__title') || {}).textContent || '';
      var matchesTerm = title.toLowerCase().indexOf(term) > -1;
      var status = row.classList.contains('is-danger') ? 'vencido'
        : row.classList.contains('is-warning') ? 'proximo'
        : 'valido';
      var matchesStatus = activeStatus === 'todos' || activeStatus === status;
      var show = matchesTerm && matchesStatus;
      row.style.display = show ? '' : 'none';
      if (show) visible++;
    });
    var emptyState = document.querySelector('[data-lote-empty]');
    if (emptyState) emptyState.hidden = visible > 0;
  }

  // ---------- mais opções ----------
  var moreBtn = document.querySelector('[data-lote-more]');
  if (moreBtn) {
    moreBtn.addEventListener('click', function () {
      showToast('Mais opções em desenvolvimento.', 'info');
    });
  }

  // ---------- paginação (demonstração) ----------
  var pagination = document.querySelector('[data-pagination]');
  if (pagination) {
    var pageBtns = Array.prototype.slice.call(pagination.querySelectorAll('[data-page]'));
    var prevBtn = pagination.querySelector('[data-page-prev]');
    var nextBtn = pagination.querySelector('[data-page-next]');

    function goToPage(n) {
      pageBtns.forEach(function (b) {
        b.classList.toggle('is-active', b.getAttribute('data-page') === String(n));
      });
      if (prevBtn) prevBtn.disabled = n <= 1;
      if (nextBtn) nextBtn.disabled = n >= pageBtns.length;
      if (n === 1) {
        showToast('Mostrando página 1 de lotes.', 'info');
      } else {
        showToast('Esta é uma demonstração — apenas a página 1 tem dados de exemplo.', 'info');
      }
    }

    pageBtns.forEach(function (btn) {
      btn.addEventListener('click', function () { goToPage(parseInt(btn.getAttribute('data-page'), 10)); });
    });
    if (prevBtn) {
      prevBtn.addEventListener('click', function () {
        var current = pageBtns.filter(function (b) { return b.classList.contains('is-active'); })[0];
        var n = current ? parseInt(current.getAttribute('data-page'), 10) : 1;
        if (n > 1) goToPage(n - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', function () {
        var current = pageBtns.filter(function (b) { return b.classList.contains('is-active'); })[0];
        var n = current ? parseInt(current.getAttribute('data-page'), 10) : 1;
        if (n < pageBtns.length) goToPage(n + 1);
      });
    }
  }
});

// funcionarios.js — telas Funcionários e Matrículas (lista, nova matrícula, novo funcionário)

function markInvalid(field) {
  field.classList.add('is-invalid');
  var wrap = field.closest('.field');
  if (wrap) wrap.classList.add('field--error');
}

function clearInvalid(field) {
  field.classList.remove('is-invalid');
  var wrap = field.closest('.field');
  if (wrap) wrap.classList.remove('field--error');
}

// ---------- funcionariosMatricula.html: abas, busca e ações ----------
function initFuncionariosLista() {
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-panel]'));
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-tab]'));
  if (!panels.length || !tabs.length) return;

  function activateTab(name) {
    tabs.forEach(function (btn) {
      var on = btn.getAttribute('data-tab') === name;
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panels.forEach(function (panel) {
      panel.hidden = panel.getAttribute('data-panel') !== name;
    });
  }

  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var name = btn.getAttribute('data-tab');
      activateTab(name);
      history.replaceState(null, '', '#' + name);
    });
  });

  // abre direto na aba pedida pela URL (ex.: depois de cadastrar uma matrícula)
  var inicial = window.location.hash.replace('#', '');
  activateTab(inicial === 'matriculas' ? 'matriculas' : 'funcionarios');

  function rowsOf(name) {
    var tbody = document.querySelector('[data-rows="' + name + '"]');
    return tbody ? Array.prototype.slice.call(tbody.querySelectorAll('tr')) : [];
  }

  var storageKey = 'sweetlog-funcionarios-matriculas';
  var records = { funcionarios: {}, matriculas: {} };

  function fieldsFor(name) {
    return name === 'funcionarios'
      ? ['matricula', 'nome', 'setor', 'telefone']
      : ['numero', 'setor'];
  }

  function getRowValues(row, name) {
    var cells = row.cells;
    if (name === 'funcionarios') {
      var person = cells[1].querySelector('.person');
      var avatar = person && person.querySelector('.mini-avatar');
      return {
        matricula: cells[0].textContent.trim(),
        nome: person ? person.textContent.replace(avatar ? avatar.textContent : '', '').trim() : cells[1].textContent.trim(),
        setor: cells[2].textContent.trim(),
        telefone: cells[3].textContent.trim()
      };
    }
    return {
      numero: cells[0].textContent.trim(),
      setor: cells[1].textContent.trim()
    };
  }

  function getStorageKey(row, name) {
    if (!row.dataset.recordKey) {
      row.dataset.recordKey = name + '-' + row.dataset.id;
    }
    return row.dataset.recordKey;
  }

  function setPersonCell(cell, name) {
    var person = document.createElement('div');
    person.className = 'person';
    var avatar = document.createElement('span');
    avatar.className = 'mini-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = name.trim().split(/\s+/).map(function (part) {
      return part.charAt(0);
    }).join('').slice(0, 2).toUpperCase();
    person.appendChild(avatar);
    person.appendChild(document.createTextNode(name));
    cell.replaceChildren(person);
  }

  function renderRow(row, name, values) {
    if (name === 'funcionarios') {
      row.cells[0].textContent = values.matricula;
      setPersonCell(row.cells[1], values.nome);
      row.cells[2].textContent = values.setor;
      row.cells[3].textContent = values.telefone;
      row.dataset.id = values.matricula;
    } else {
      row.cells[0].textContent = values.numero;
      row.cells[1].textContent = values.setor;
      row.dataset.id = values.numero;
    }
  }

  try {
    var storedRecords = localStorage.getItem(storageKey);
    if (storedRecords) {
      var parsedRecords = JSON.parse(storedRecords);
      if (!parsedRecords || typeof parsedRecords !== 'object' ||
          !parsedRecords.funcionarios || !parsedRecords.matriculas) {
        throw new Error('Os dados salvos de funcionários e matrículas são inválidos.');
      }
      records = parsedRecords;
    }
  } catch (error) {
    showToast('Não foi possível carregar as alterações salvas de funcionários e matrículas.', 'error');
  }

  ['funcionarios', 'matriculas'].forEach(function (name) {
    rowsOf(name).forEach(function (row) {
      var key = getStorageKey(row, name);
      var values = records[name][key];
      if (values && fieldsFor(name).every(function (field) {
        return typeof values[field] === 'string';
      })) {
        renderRow(row, name, values);
      }
    });
  });

  function beginRowEdit(row, name) {
    var originalValues = getRowValues(row, name);
    var fields = fieldsFor(name);
    var columnIndexes = name === 'funcionarios' ? [0, 1, 2, 3] : [0, 1];
    fields.forEach(function (field, index) {
      var input = document.createElement('input');
      input.className = 'input';
      input.type = 'text';
      input.name = field;
      input.value = originalValues[field];
      input.required = true;
      input.setAttribute('aria-label', field === 'matricula' || field === 'numero'
        ? 'Número da matrícula'
        : field === 'nome' ? 'Nome do funcionário'
          : field === 'telefone' ? 'Telefone do funcionário' : 'Setor');
      row.cells[columnIndexes[index]].replaceChildren(input);
    });

    var actions = row.querySelector('.row-actions');
    actions.replaceChildren();
    var saveButton = document.createElement('button');
    saveButton.type = 'button';
    saveButton.className = 'btn btn--primary';
    saveButton.textContent = 'Salvar';
    saveButton.setAttribute('data-row-save', '');
    var cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn btn--outline';
    cancelButton.textContent = 'Cancelar';
    cancelButton.setAttribute('data-row-cancel', '');
    actions.appendChild(saveButton);
    actions.appendChild(cancelButton);

    cancelButton.addEventListener('click', function () {
      renderRow(row, name, originalValues);
      restoreRowActions(row, name);
    });

    saveButton.addEventListener('click', function () {
      var values = {};
      var valid = true;
      fields.forEach(function (field, index) {
        var input = row.cells[columnIndexes[index]].querySelector('input');
        values[field] = input.value.trim();
        if (!values[field]) {
          input.classList.add('is-invalid');
          valid = false;
        }
      });
      if (!valid) {
        showToast('Preencha todos os campos antes de salvar.', 'error');
        return;
      }

      var primaryField = name === 'funcionarios' ? 'matricula' : 'numero';
      var duplicate = rowsOf(name).some(function (otherRow) {
        if (otherRow === row) return false;
        var otherValues = getRowValues(otherRow, name);
        return otherValues[primaryField].toLowerCase() === values[primaryField].toLowerCase();
      });
      if (duplicate) {
        row.cells[columnIndexes[0]].querySelector('input').classList.add('is-invalid');
        showToast('Já existe um registro com esse número de matrícula.', 'error');
        return;
      }

      var updatedRecords = {
        funcionarios: Object.assign({}, records.funcionarios),
        matriculas: Object.assign({}, records.matriculas)
      };
      var key = getStorageKey(row, name);
      updatedRecords[name][key] = values;

      var relatedName = name === 'funcionarios' ? 'matriculas' : 'funcionarios';
      var identity = key.slice(name.length + 1);
      var relatedKey = relatedName + '-' + identity;
      var relatedRow = document.querySelector('[data-rows="' + relatedName + '"] [data-record-key="' + relatedKey + '"]');
      if (relatedRow) {
        var relatedValues = getRowValues(relatedRow, relatedName);
        if (name === 'funcionarios') {
          relatedValues.numero = values.matricula;
          relatedValues.setor = values.setor;
        } else {
          relatedValues.matricula = values.numero;
          relatedValues.setor = values.setor;
        }
        updatedRecords[relatedName][relatedKey] = relatedValues;
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedRecords));
      } catch (error) {
        showToast('Não foi possível salvar as alterações. Verifique o armazenamento do navegador.', 'error');
        return;
      }

      records = updatedRecords;
      renderRow(row, name, values);
      restoreRowActions(row, name);
      if (relatedRow) renderRow(relatedRow, relatedName, updatedRecords[relatedName][relatedKey]);
      refresh('funcionarios');
      refresh('matriculas');
      showToast(name === 'funcionarios'
        ? 'Informações do funcionário atualizadas.'
        : 'Informações da matrícula atualizadas.', 'success');
    });
  }

  function restoreRowActions(row, name) {
    var actions = row.querySelector('.row-actions');
    var editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'icon-btn';
    editButton.setAttribute('aria-label', name === 'funcionarios' ? 'Editar funcionário' : 'Editar matrícula');
    editButton.setAttribute('data-action', 'editar');
    editButton.textContent = '✏️';

    var deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'icon-btn icon-btn--danger';
    deleteButton.setAttribute('aria-label', 'Excluir ' + (name === 'funcionarios' ? 'funcionário' : 'matrícula'));
    deleteButton.setAttribute('data-action', 'excluir');
    deleteButton.setAttribute('data-tipo', name === 'funcionarios' ? 'funcionario' : 'matricula');
    deleteButton.textContent = '🗑️';
    actions.replaceChildren(editButton, deleteButton);
  }

  // atualiza contador da aba, rodapé e estado vazio
  function refresh(name) {
    var rows = rowsOf(name);
    var visiveis = rows.filter(function (r) { return r.style.display !== 'none'; }).length;

    var count = document.querySelector('[data-count="' + name + '"]');
    if (count) count.textContent = rows.length;

    var foot = document.querySelector('[data-foot="' + name + '"]');
    if (foot) {
      var rotulo = name === 'funcionarios' ? 'funcionários' : 'matrículas';
      foot.textContent = 'Mostrando ' + visiveis + ' de ' + rows.length + ' ' + rotulo;
    }

    var panel = document.querySelector('[data-panel="' + name + '"]');
    var empty = panel && panel.querySelector('[data-empty]');
    if (empty) empty.hidden = visiveis > 0;
  }

  // ---------- busca ----------
  document.querySelectorAll('[data-func-search]').forEach(function (input) {
    var name = input.getAttribute('data-func-search');
    input.addEventListener('input', function () {
      var term = input.value.trim().toLowerCase();
      rowsOf(name).forEach(function (row) {
        var match = row.textContent.toLowerCase().indexOf(term) > -1;
        row.style.display = match ? '' : 'none';
      });
      refresh(name);
    });
  });

  // ---------- editar / excluir ----------
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-action]');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var row = btn.closest('tr');
    var tbody = row.parentNode;
    var name = tbody.getAttribute('data-rows');

    if (action === 'editar') {
      if (btn.closest('.row-actions').querySelector('[data-row-save]')) return;
      beginRowEdit(row, name);
      return;
    }

    if (action === 'excluir') {
      var id = row.getAttribute('data-id');
      var tipo = btn.getAttribute('data-tipo');
      var texto = tipo === 'matricula'
        ? 'Excluir a matrícula ' + id + '?'
        : 'Excluir o funcionário da matrícula ' + id + '?';
      if (!confirm(texto)) return;
      var updatedRecords = {
        funcionarios: Object.assign({}, records.funcionarios),
        matriculas: Object.assign({}, records.matriculas)
      };
      delete updatedRecords[name][getStorageKey(row, name)];
      try {
        localStorage.setItem(storageKey, JSON.stringify(updatedRecords));
      } catch (error) {
        showToast('Não foi possível excluir o registro. Verifique o armazenamento do navegador.', 'error');
        return;
      }
      records = updatedRecords;
      row.remove();
      refresh(name);
      showToast(tipo === 'matricula' ? 'Matrícula excluída.' : 'Funcionário excluído.', 'success');
    }
  });

  refresh('funcionarios');
  refresh('matriculas');
}

// ---------- nova-matricula.html ----------
function initMatriculaForm() {
  var form = document.querySelector('[data-matricula-form]');
  if (!form) return;

  var numero = document.getElementById('numero');
  var setor = document.getElementById('setor');
  [numero, setor].forEach(clearErrorOnInput);

  // aceita 10426 ou MAT-001: letras, números e hífen (maiúsculas), até 12 caracteres
  numero.addEventListener('input', function () {
    numero.value = numero.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var isValid = validateRequired([numero, setor]);
    if (!isValid) {
      showToast('Preencha o número da matrícula e o setor.', 'error');
      return;
    }
    if (numero.value.length < 3 || !/\d/.test(numero.value)) {
      markInvalid(numero);
      showToast('Informe uma matrícula válida (ex.: 10426 ou MAT-001).', 'error');
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    setTimeout(function () {
      showToast('Matrícula ' + numero.value + ' cadastrada com sucesso!', 'success');
      redirectAfterToast('funcionariosMatricula.html#matriculas');
    }, 700);
  });
}

// ---------- novo-funcionario.html ----------
function initFuncionarioForm() {
  var form = document.querySelector('[data-funcionario-form]');
  if (!form) return;

  var matricula = document.getElementById('matricula');
  var nome = document.getElementById('nome');
  var setor = document.getElementById('setor');
  var telefone = document.getElementById('telefone');
  [matricula, nome, setor, telefone].forEach(clearErrorOnInput);

  // a matrícula já define o setor: preenche sozinho (continua editável)
  matricula.addEventListener('change', function () {
    var opt = matricula.options[matricula.selectedIndex];
    var s = opt && opt.getAttribute('data-setor');
    if (s) {
      setor.value = s;
      clearInvalid(setor);
    }
  });

  telefone.addEventListener('input', function () {
    telefone.value = formatPhone(telefone.value.replace(/\D/g, ''));
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var isValid = validateRequired([matricula, nome, setor, telefone]);
    if (!isValid) {
      showToast('Preencha os campos obrigatórios do funcionário.', 'error');
      return;
    }
    if (nome.value.trim().split(/\s+/).length < 2) {
      markInvalid(nome);
      showToast('Informe o nome e o sobrenome.', 'error');
      return;
    }
    var digitos = telefone.value.replace(/\D/g, '');
    if (digitos.length < 10 || digitos.length > 11) {
      markInvalid(telefone);
      showToast('Informe um telefone válido com DDD.', 'error');
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Salvando...';

    setTimeout(function () {
      showToast('Funcionário "' + nome.value.trim() + '" cadastrado com sucesso!', 'success');
      redirectAfterToast('funcionariosMatricula.html#funcionarios');
    }, 700);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  initFuncionariosLista();
  initMatriculaForm();
  initFuncionarioForm();
});