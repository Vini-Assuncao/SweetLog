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

// ---------- validação simples de campos obrigatórios ----------
function validateRequired(fields) {
  var isValid = true;
  fields.forEach(function (field) {
    if (!field) return;
    var value = (field.value || '').trim();
    var wrap = field.closest('.field');
    if (!value) {
      isValid = false;
      field.classList.add('is-invalid');
      if (wrap) wrap.classList.add('field--error');
    } else {
      field.classList.remove('is-invalid');
      if (wrap) wrap.classList.remove('field--error');
    }
  });
  return isValid;
}

function clearErrorOnInput(field) {
  if (!field) return;
  field.addEventListener('input', function () {
    field.classList.remove('is-invalid');
    var wrap = field.closest('.field');
    if (wrap) wrap.classList.remove('field--error');
  });
}

// ---------- navegação global: menu lateral, perfil, sair, ícones do topo ----------
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
  document.querySelectorAll('.profile-pop__logout, .drawer__logout').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (confirm('Deseja realmente sair da sua conta?')) {
        window.location.href = 'login.html';
      }
    });
  });

  // ícones de notificações e configurações do topo
  document.querySelectorAll('.icon-btn[aria-label="Notificações"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showToast('Você não tem novas notificações.', 'info');
    });
  });
  document.querySelectorAll('.icon-btn[aria-label="Configurações"]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      showToast('Configurações em desenvolvimento.', 'info');
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

document.addEventListener('DOMContentLoaded', function () {
  initGlobalNav();
  initPlaceholderLinks();
  initLoginForm();
});

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
      window.location.href = 'produtos-lista.html';
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
      text.textContent = file.name;
      hint.textContent = (file.size / 1024 / 1024).toFixed(2) + ' MB anexado';
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
  var lote = document.getElementById('lote');
  var validade = document.getElementById('validade');
  [produto, lote, validade].forEach(clearErrorOnInput);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var isValid = validateRequired([produto, lote, validade]);

    var nf = document.getElementById('nf');
    if (!nf.files.length) {
      showToast('Anexe a nota fiscal em PDF.', 'error');
      isValid = false;
    }
    var reprovado = form.querySelector('input[name="inspecao"]:checked').value === 'reprovado';
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
      window.location.href = 'estoque.html';
    }, 700);
  });
}

// ---------- validação: saída de produtos ----------
function initSaidaForm() {
  var form = document.querySelector('[data-saida-form]');
  if (!form) return;

  var produto2 = document.getElementById('produto2');
  var motivo = document.getElementById('motivo');
  [produto2, motivo].forEach(clearErrorOnInput);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var isValid = validateRequired([produto2, motivo]);
    if (!isValid) {
      showToast('Selecione o produto e o motivo da saída.', 'error');
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Registrando...';

    setTimeout(function () {
      showToast('Saída de produto registrada com sucesso!', 'success');
      window.location.href = 'estoque.html';
    }, 700);
  });
}
// produtos-lista.js — busca ao vivo + ordenação do catálogo
document.addEventListener('DOMContentLoaded', function () {
  var grid = document.querySelector('[data-product-grid]');
  if (!grid) return;

  var searchInput = document.querySelector('[data-produto-search]');
  var emptyState = document.querySelector('[data-empty-state]');
  var cards = Array.prototype.slice.call(grid.querySelectorAll('.product-card'));

  function applySearch() {
    var term = (searchInput.value || '').trim().toLowerCase();
    var visibleCount = 0;

    cards.forEach(function (card) {
      var nome = (card.getAttribute('data-nome') || '').toLowerCase();
      var matches = nome.indexOf(term) > -1;
      card.style.display = matches ? '' : 'none';
      if (matches) visibleCount++;
    });

    if (emptyState) emptyState.hidden = visibleCount > 0;
  }

  if (searchInput) searchInput.addEventListener('input', applySearch);

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
document.addEventListener('DOMContentLoaded', function () {
  var grid = document.querySelector('[data-order-grid]');
  var searchInput = document.querySelector('[data-pedido-search]');
  var emptyState = document.querySelector('[data-empty-state]');
  if (!grid || !searchInput) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('.order-card'));

  searchInput.addEventListener('input', function () {
    var term = searchInput.value.trim().toLowerCase();
    var visibleCount = 0;

    cards.forEach(function (card) {
      var numero = (card.getAttribute('data-numero') || '').toLowerCase();
      var matches = numero.indexOf(term) > -1;
      card.style.display = matches ? '' : 'none';
      if (matches) visibleCount++;
    });

    if (emptyState) emptyState.hidden = visibleCount > 0;
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
        showToast('Relatório de 24/10/2023 exportado com sucesso!', 'success');
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
  var searchToggle = document.querySelector('[data-lote-search-toggle]');
  var searchWrap = document.querySelector('[data-lote-search-wrap]');
  var searchInput = document.querySelector('[data-lote-search]');

  if (searchToggle && searchWrap && searchInput) {
    searchToggle.addEventListener('click', function () {
      searchWrap.hidden = !searchWrap.hidden;
      if (!searchWrap.hidden) searchInput.focus();
    });
    searchInput.addEventListener('input', applyFilters);
  }

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
    var term = searchInput ? searchInput.value.trim().toLowerCase() : '';
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
