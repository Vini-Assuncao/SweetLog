(function (window, document) {
  'use strict';

  var app = window.SweetLog = window.SweetLog || {};
  var api = app.api;
  var ui = app.ui;

  function productCard(product) {
    var id = Number(product.id_produto);
    var quantity = Number(product.quantidade_disponivel || 0);
    var low = quantity <= 20 && Number(product.total_lotes || 0) > 0;
    var image = product.imagem ? ui.asset(product.imagem) : '';
    var imageMarkup = image
      ? '<img src="' + ui.escape(image) + '" alt="' + ui.escape(product.nome) + '" loading="lazy">'
      : '<span class="product-placeholder">🥐</span>';
    return '<a class="product-card" href="produto-detalhe.html?id=' + id + '" data-nome="' + ui.escape(product.nome) + '" data-qtd="' + quantity + '">' +
      '<div class="product-card__img" style="background:#f5f1eb;display:flex;align-items:center;justify-content:center;overflow:hidden">' + imageMarkup +
      '<span class="badge ' + (low ? 'badge--warning' : 'badge--success') + ' product-card__tag">' + (low ? 'Estoque baixo' : 'Em estoque') + '</span></div>' +
      '<div class="product-card__body"><h3>' + ui.escape(product.nome) + '</h3>' +
      '<p class="muted">' + ui.escape(product.marca || 'Marca não informada') + '</p>' +
      '<div class="product-card__foot"><span>Qtd.: ' + quantity + ' unid.</span><span class="edit-ico">✎</span></div></div></a>';
  }

  async function initProductList() {
    var grid = document.querySelector('[data-product-grid]');
    if (!grid) return;
    var search = document.querySelector('[data-produto-search]');
    var empty = document.querySelector('[data-empty-state]');
    var sortMenu = document.querySelector('[data-sort-menu]');
    var products = [];
    var sort = 'nome-asc';

    async function load() {
      grid.innerHTML = '<p class="muted">Carregando produtos...</p>';
      try {
        var query = search && search.value.trim() ? '?buscar=' + encodeURIComponent(search.value.trim()) : '';
        var result = await api.get('/produtos' + query);
        products = result.produtos || [];
        render();
      } catch (error) {
        grid.innerHTML = '<p class="muted">Não foi possível carregar os produtos.</p>';
        ui.toast(error.message, 'error');
      }
    }

    function render() {
      var filtered = products.slice();
      if (search && search.value.trim()) {
        var term = search.value.trim().toLocaleLowerCase('pt-BR');
        filtered = filtered.filter(function (p) {
          return [p.nome, p.marca, p.cnpj_fabricante].join(' ').toLocaleLowerCase('pt-BR').includes(term);
        });
      }
      filtered.sort(function (a, b) {
        if (sort === 'nome-desc') return String(b.nome).localeCompare(String(a.nome), 'pt-BR');
        if (sort === 'qtd-desc') return Number(b.quantidade_disponivel || 0) - Number(a.quantidade_disponivel || 0);
        if (sort === 'qtd-asc') return Number(a.quantidade_disponivel || 0) - Number(b.quantidade_disponivel || 0);
        return String(a.nome).localeCompare(String(b.nome), 'pt-BR');
      });
      grid.innerHTML = filtered.map(productCard).join('');
      if (empty) empty.hidden = filtered.length > 0;
    }

    if (search) {
      var timer;
      search.addEventListener('input', function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(load, 250);
      });
    }
    var sortToggle = document.querySelector('[data-sort-toggle]');
    if (sortToggle && sortMenu) sortToggle.addEventListener('click', function () { sortMenu.hidden = !sortMenu.hidden; });
    if (sortMenu) sortMenu.querySelectorAll('[data-sort]').forEach(function (button) {
      button.addEventListener('click', function () {
        sort = button.dataset.sort;
        sortMenu.hidden = true;
        render();
      });
    });
    await load();
  }

  function applyCnpjMask(input) {
    if (!input) return;
    input.addEventListener('input', function () {
      var d = input.value.replace(/\D/g, '').slice(0, 14);
      input.value = d
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    });
  }

  function initProductCreate() {
    var form = document.querySelector('[data-produto-form]');
    if (!form) return;
    var fileInput = form.querySelector('[name="imagem"]');
    var preview = document.querySelector('[data-upload-preview]');
    var uploadText = document.querySelector('[data-upload-text]');
    var uploadHint = document.querySelector('[data-upload-hint]');
    var cnpj = form.querySelector('[name="cnpj_fabricante"]');
    applyCnpjMask(cnpj);

    if (fileInput) fileInput.addEventListener('change', function () {
      var file = fileInput.files[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
        ui.toast('Selecione uma imagem JPG ou PNG de até 5 MB.', 'error');
        fileInput.value = '';
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        if (preview) { preview.src = reader.result; preview.hidden = false; }
        var icon = document.querySelector('[data-upload-icon]');
        if (icon) icon.hidden = true;
        if (uploadText) uploadText.textContent = file.name;
        if (uploadHint) uploadHint.textContent = 'Clique para trocar a imagem';
      };
      reader.readAsDataURL(file);
    });

    var cancel = form.querySelector('[data-cancel-btn]');
    if (cancel) cancel.addEventListener('click', function () {
      if (window.confirm('Descartar os dados preenchidos?')) window.location.href = 'produtos-lista.html';
    });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var name = form.querySelector('[name="nome"]');
      var refrigeration = form.querySelector('[name="necessidade_refrigeracao"]:checked');
      if (!name.value.trim() || !cnpj.value.trim() || cnpj.value.replace(/\D/g, '').length !== 14 || !refrigeration) {
        ui.toast('Informe nome, CNPJ com 14 dígitos e necessidade de refrigeração.', 'error');
        return;
      }
      var button = form.querySelector('[type="submit"]');
      ui.setBusy(button, true, 'Cadastrando...');
      try {
        var data = new FormData(form);
        data.set('cnpj_fabricante', cnpj.value.replace(/\D/g, ''));
        var result = await api.post('/produtos', data);
        ui.toast(result.mensagem || 'Produto cadastrado.', 'success');
        window.setTimeout(function () { window.location.href = 'produtos-lista.html'; }, 700);
      } catch (error) {
        ui.toast(error.message, 'error');
        ui.setBusy(button, false);
      }
    });
  }

  async function initProductDetail() {
    var form = document.querySelector('[data-product-detail-form]');
    if (!form) return;
    var id = new URLSearchParams(window.location.search).get('id');
    if (!id || !/^\d+$/.test(id)) {
      ui.toast('Escolha um produto na listagem.', 'error');
      window.location.replace('produtos-lista.html');
      return;
    }

    var title = document.querySelector('.crumb-row h1');
    var desc = document.querySelector('.detail-photo__desc p');
    var imageBox = document.querySelector('.detail-photo__img');
    var stockValue = document.querySelector('.stat-box__value');
    var nextExpiry = document.querySelectorAll('.stat-box__value')[1];
    var expiryBadge = document.querySelector('.stat-box .badge');
    var editButton = document.querySelector('[data-edit-product]');
    var actions = form.querySelector('[data-detail-actions]');
    var deleteButton = document.querySelector('[data-delete-product]');
    var inputs = Array.prototype.slice.call(form.querySelectorAll('[data-detail-input]'));
    var product = null;
    var stocks = [];

    function setEditing(editing) {
      inputs.forEach(function (input) {
        var value = form.querySelector('[data-detail-value="' + input.dataset.detailInput + '"]');
        if (value) value.style.display = editing ? 'none' : '';
        input.style.display = editing ? '' : 'none';
      });
      if (actions) actions.style.display = editing ? 'flex' : 'none';
      if (editButton) editButton.style.display = editing ? 'none' : '';
      if (deleteButton) deleteButton.style.display = editing ? 'none' : '';
    }

    function fill(values) {
      inputs.forEach(function (input) {
        var key = input.dataset.detailInput;
        var field = key === 'refrigeracao' ? 'necessidade_refrigeracao' : key;
        var val = values[field];
        if (input.type === 'select-one') input.value = String(!!val);
        else input.value = val == null ? '' : String(val);
        var output = form.querySelector('[data-detail-value="' + key + '"]');
        if (output) output.textContent = key === 'refrigeracao' ? (String(val) === 'true' || val === 1 ? 'Sim' : 'Não') : (val || 'Não informado');
      });
    }

    try {
      var responses = await Promise.all([
        api.get('/produtos/' + encodeURIComponent(id)),
        api.get('/estoques/produto/' + encodeURIComponent(id))
      ]);
      product = responses[0].produto;
      stocks = responses[1].estoques || [];
      if (title) title.textContent = product.nome;
      if (desc) desc.textContent = product.descricao || 'Nenhuma descrição cadastrada.';
      if (imageBox && product.imagem) {
        imageBox.style.background = 'center / contain no-repeat url("' + ui.asset(product.imagem).replace(/"/g, '%22') + '")';
      }
      fill(product);
      var availableStocks = stocks.filter(function (s) { return Number(s.quantidade) > 0 && ui.dateOnly(s.data_validade) >= ui.todayISO(); });
      var availableQuantity = availableStocks.reduce(function (sum, item) { return sum + Number(item.quantidade || 0); }, 0);
      if (stockValue) stockValue.innerHTML = ui.escape(availableQuantity) + ' <small>unidades</small>';
      var nearest = availableStocks.slice().sort(function (a, b) { return ui.dateOnly(a.data_validade).localeCompare(ui.dateOnly(b.data_validade)); })[0];
      if (nextExpiry) nextExpiry.textContent = nearest ? ui.formatDate(nearest.data_validade) : '—';
      if (expiryBadge) expiryBadge.textContent = nearest ? (Number(nearest.dias_para_validade) + ' dias restantes') : 'Sem lote válido';
      var sku = document.querySelector('.detail-photo__desc .sku');
      if (sku) sku.textContent = 'Código do produto: ' + product.id_produto + ' • Lotes: ' + stocks.length;
    } catch (error) {
      ui.toast(error.message, 'error');
      return;
    }

    if (editButton) editButton.addEventListener('click', function () { setEditing(true); });
    var cancel = form.querySelector('[data-cancel-detail]');
    if (cancel) cancel.addEventListener('click', function () { fill(product); setEditing(false); });
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var cnpjInput = form.querySelector('[name="cnpj_fabricante"]');
      if (cnpjInput && cnpjInput.value.replace(/\D/g, '').length !== 14) {
        ui.toast('O CNPJ deve conter 14 dígitos.', 'error');
        return;
      }
      var body = new FormData();
      inputs.forEach(function (input) {
        var key = input.dataset.detailInput === 'refrigeracao' ? 'necessidade_refrigeracao' : input.dataset.detailInput;
        body.set(key, input.dataset.detailInput === 'refrigeracao' ? input.value : input.value.trim());
      });
      body.set('cnpj_fabricante', (body.get('cnpj_fabricante') || '').replace(/\D/g, ''));
      var save = form.querySelector('[type="submit"]');
      ui.setBusy(save, true, 'Salvando...');
      try {
        var result = await api.put('/produtos/' + encodeURIComponent(id), body);
        product = result.novoProduto || product;
        fill(product);
        setEditing(false);
        if (title) title.textContent = product.nome;
        if (desc) desc.textContent = product.descricao || 'Nenhuma descrição cadastrada.';
        ui.toast(result.mensagem || 'Produto atualizado.', 'success');
      } catch (error) {
        ui.toast(error.message, 'error');
      } finally {
        ui.setBusy(save, false);
      }
    });

    if (deleteButton) deleteButton.addEventListener('click', async function () {
      if (!window.confirm('Excluir este produto? A API bloqueará a exclusão se houver lotes ou alertas associados.')) return;
      try {
        var result = await api.delete('/produtos/' + encodeURIComponent(id));
        ui.toast(result.mensagem || 'Produto excluído.', 'success');
        window.setTimeout(function () { window.location.href = 'produtos-lista.html'; }, 700);
      } catch (error) {
        ui.toast(error.message, 'error');
      }
    });
    setEditing(false);
  }

  app.pages = app.pages || {};
  app.pages.initProducts = function () {
    initProductList();
    initProductCreate();
    initProductDetail();
  };
})(window, document);
