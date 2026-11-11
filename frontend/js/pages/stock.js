(function (window, document) {
  'use strict';

  var app = window.SweetLog = window.SweetLog || {};
  var api = app.api;
  var ui = app.ui;

  async function initStockEntry() {
    var form = document.querySelector('[data-entrada-form]');
    if (!form) return;
    var productSelect = form.querySelector('[name="id_produto"]');
    var fileInput = form.querySelector('[name="nota_fiscal"]');
    var products = [];

    try {
      var result = await api.get('/produtos');
      products = result.produtos || [];
      productSelect.innerHTML = '<option value="">Selecione um produto...</option>' + products.map(function (p) {
        return '<option value="' + Number(p.id_produto) + '">' + ui.escape(p.nome) + '</option>';
      }).join('');
    } catch (error) {
      ui.toast('Não foi possível carregar a lista de produtos: ' + error.message, 'error');
    }

    var cancel = form.querySelector('[data-cancel-btn]');
    if (cancel) cancel.addEventListener('click', function () { window.location.href = cancel.dataset.cancelHref || 'estoque.html'; });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var quantity = Number(form.querySelector('[name="quantidade"]').value);
      if (!productSelect.value || !Number.isInteger(quantity) || quantity <= 0 || !fileInput.files[0]) {
        ui.toast('Selecione o produto, informe uma quantidade válida e anexe a nota fiscal em PDF.', 'error');
        return;
      }
      var file = fileInput.files[0];
      if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
        ui.toast('A nota fiscal deve estar no formato PDF.', 'error');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        ui.toast('A nota fiscal deve ter no máximo 5 MB.', 'error');
        return;
      }
      var button = form.querySelector('[type="submit"]');
      ui.setBusy(button, true, 'Registrando entrada...');
      try {
        var body = new FormData(form);
        var response = await api.post('/estoques', body);
        ui.toast(response.mensagem || 'Entrada registrada.', 'success');
        window.setTimeout(function () { window.location.href = 'lotes.html'; }, 800);
      } catch (error) {
        ui.toast(error.message, 'error');
        ui.setBusy(button, false);
      }
    });
  }

  async function initStockExit() {
    var form = document.querySelector('[data-saida-form]');
    if (!form) return;
    var typeSelect = form.querySelector('[name="tipo_saida"]');
    var saleFields = form.querySelector('[data-saida-venda-fields]');
    var itemsContainer = form.querySelector('[data-saida-items]');
    var addItemButton = form.querySelector('[data-add-saida-item]');
    var hint = form.querySelector('[data-saida-itens-hint]');
    var totalLabel = form.querySelector('[data-saida-total]');
    var stocks = [];

    try {
      var result = await api.get('/estoques');
      stocks = (result.estoques || []).filter(function (stock) {
        return Number(stock.quantidade) > 0 && ui.dateOnly(stock.data_validade) >= ui.todayISO();
      });
    } catch (error) {
      ui.toast('Não foi possível carregar os lotes disponíveis: ' + error.message, 'error');
    }

    function stockOptions(selected) {
      var options = '<option value="">Selecione um lote...</option>';
      options += stocks.map(function (stock) {
        var label = '#' + stock.id_estoque + ' — ' + stock.nome_produto + ' — ' + stock.lote_producao +
          ' — saldo: ' + stock.quantidade + ' — validade: ' + ui.formatDate(stock.data_validade);
        return '<option value="' + Number(stock.id_estoque) + '" ' + (String(selected) === String(stock.id_estoque) ? 'selected' : '') + '>' + ui.escape(label) + '</option>';
      }).join('');
      return options;
    }

    function configureRow(row) {
      var stockField = row.querySelector('[data-item-field="id_estoque"]');
      var quantityField = row.querySelector('[data-item-field="quantidade_venda_item"]');
      var priceField = row.querySelector('[data-item-field="preco_unitario"]');
      if (stockField && stockField.tagName === 'SELECT') stockField.innerHTML = stockOptions(stockField.value);
      [stockField, quantityField, priceField].forEach(function (field) {
        if (field) {
          field.addEventListener('input', updateTotal);
          field.addEventListener('change', updateTotal);
        }
      });
      var removeButton = row.querySelector('[data-remove-saida-item]');
      if (removeButton) removeButton.addEventListener('click', function () {
        if (itemsContainer.querySelectorAll('[data-saida-item]').length > 1) {
          row.remove();
          updateRemoveButtons();
          updateTotal();
        }
      });
    }

    function updateRemoveButtons() {
      var rows = Array.prototype.slice.call(itemsContainer.querySelectorAll('[data-saida-item]'));
      rows.forEach(function (row) {
        var remove = row.querySelector('[data-remove-saida-item]');
        if (remove) remove.hidden = rows.length < 2;
      });
    }

    function updateTotal() {
      var isSale = typeSelect.value === 'venda';
      var total = 0;
      itemsContainer.querySelectorAll('[data-saida-item]').forEach(function (row) {
        var quantity = Number(row.querySelector('[data-item-field="quantidade_venda_item"]').value || 0);
        var priceInput = row.querySelector('[data-item-field="preco_unitario"]');
        if (isSale && priceInput) total += quantity * Number(priceInput.value || 0);
      });
      if (totalLabel) totalLabel.textContent = isSale ? 'Valor total estimado: ' + ui.formatMoney(total) : 'Baixa simples: o saldo será reduzido dos lotes selecionados.';
    }

    function toggleMode() {
      var sale = typeSelect.value === 'venda';
      if (saleFields) saleFields.hidden = !sale;
      form.querySelectorAll('[data-item-price-field]').forEach(function (field) { field.hidden = !sale; });
      form.querySelectorAll('[data-item-field="preco_unitario"]').forEach(function (field) { field.required = sale; });
      var file = form.querySelector('[name="nota_fiscal"]');
      if (file) file.required = sale;
      if (hint) hint.textContent = sale
        ? 'Selecione os lotes disponíveis. O sistema confere o saldo e a validade no momento da venda.'
        : 'Selecione os lotes e informe a quantidade que será baixada. As baixas são registradas individualmente.';
      updateTotal();
    }

    if (addItemButton) addItemButton.addEventListener('click', function () {
      var original = itemsContainer.querySelector('[data-saida-item]');
      if (!original) return;
      var clone = original.cloneNode(true);
      clone.querySelectorAll('input').forEach(function (input) {
        if (input.dataset.itemField === 'quantidade_venda_item') input.value = '1';
        else if (input.dataset.itemField === 'preco_unitario') input.value = '0';
      });
      var select = clone.querySelector('select[data-item-field="id_estoque"]');
      if (select) select.value = '';
      itemsContainer.appendChild(clone);
      configureRow(clone);
      updateRemoveButtons();
      updateTotal();
    });

    itemsContainer.querySelectorAll('[data-saida-item]').forEach(configureRow);
    updateRemoveButtons();
    typeSelect.addEventListener('change', toggleMode);
    toggleMode();

    var cancel = form.querySelector('[data-cancel-btn]');
    if (cancel) cancel.addEventListener('click', function () { window.location.href = cancel.dataset.cancelHref || 'estoque.html'; });

    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var isSale = typeSelect.value === 'venda';
      var rows = Array.prototype.slice.call(itemsContainer.querySelectorAll('[data-saida-item]'));
      var items = rows.map(function (row) {
        return {
          id_estoque: Number(row.querySelector('[data-item-field="id_estoque"]').value),
          quantidade_venda_item: Number(row.querySelector('[data-item-field="quantidade_venda_item"]').value),
          preco_unitario: Number(row.querySelector('[data-item-field="preco_unitario"]').value || 0)
        };
      });
      if (!items.length || items.some(function (item) { return !item.id_estoque || !Number.isInteger(item.quantidade_venda_item) || item.quantidade_venda_item <= 0; })) {
        ui.toast('Selecione um lote e informe uma quantidade inteira positiva para cada item.', 'error');
        return;
      }
      if (new Set(items.map(function (item) { return item.id_estoque; })).size !== items.length) {
        ui.toast('Não repita o mesmo lote em linhas diferentes. Ajuste a quantidade em uma única linha.', 'error');
        return;
      }

      var button = form.querySelector('[type="submit"]');
      ui.setBusy(button, true, isSale ? 'Registrando venda...' : 'Registrando baixas...');
      try {
        if (isSale) {
          var buyer = form.querySelector('[name="comprador"]').value.trim();
          var orderDate = form.querySelector('[name="data_pedido"]').value;
          var deliveryDate = form.querySelector('[name="data_entrega"]').value;
          var invoice = form.querySelector('[name="nota_fiscal"]').files[0];
          if (!buyer || !orderDate || !invoice) throw new Error('Para registrar uma venda, informe comprador, data do pedido e nota fiscal em PDF.');
          if (deliveryDate && deliveryDate < orderDate) throw new Error('A data de entrega não pode ser anterior à data do pedido.');
          if (invoice.size > 5 * 1024 * 1024 || (invoice.type !== 'application/pdf' && !/\.pdf$/i.test(invoice.name))) throw new Error('A nota fiscal deve ser PDF de até 5 MB.');
          var body = new FormData();
          body.set('comprador', buyer);
          body.set('data_pedido', orderDate);
          if (deliveryDate) body.set('data_entrega', deliveryDate);
          body.set('itens', JSON.stringify(items));
          body.set('nota_fiscal', invoice);
          var response = await api.post('/vendas', body);
          ui.toast(response.mensagem || 'Venda registrada.', 'success');
          window.setTimeout(function () { window.location.href = 'vendas.html'; }, 800);
        } else {
          var motivoInput = form.querySelector('[name="motivo_baixa"]');
          var motivo = motivoInput ? motivoInput.value.trim() : 'Baixa manual de estoque';
          for (var i = 0; i < items.length; i += 1) {
            await api.post('/estoques/' + items[i].id_estoque + '/saida', {
              quantidade: items[i].quantidade_venda_item,
              motivo: motivo || 'Baixa manual de estoque'
            });
          }
          ui.toast('Baixa(s) de estoque registrada(s).', 'success');
          window.setTimeout(function () { window.location.href = 'lotes.html'; }, 800);
        }
      } catch (error) {
        ui.toast(error.message, 'error');
        ui.setBusy(button, false);
      }
    });
  }

  async function initStockOverview() {
    var main = document.querySelector('main.page--center');
    if (!main) return;
    try {
      var result = await api.get('/estoques/resumo');
      var summary = result.resumo || {};
      var panel = document.createElement('div');
      panel.className = 'kpi-grid';
      panel.style.marginTop = '28px';
      panel.innerHTML = [
        ['Lotes com saldo', summary.lotes_com_saldo || 0],
        ['Unidades disponíveis', summary.quantidade_disponivel || 0],
        ['Vencendo em até 7 dias', summary.vencimento_em_7_dias || 0],
        ['Lotes vencidos', summary.lotes_vencidos || 0]
      ].map(function (item) {
        return '<div class="card kpi-card"><p class="kpi-card__label">' + ui.escape(item[0]) + '</p><p class="kpi-card__value">' + ui.escape(item[1]) + '</p></div>';
      }).join('');
      main.appendChild(panel);
      var link = document.createElement('a');
      link.className = 'btn btn--outline';
      link.href = 'lotes.html';
      link.textContent = 'Consultar todos os lotes';
      link.style.marginTop = '16px';
      main.appendChild(link);
    } catch (error) {
      ui.toast(error.message, 'error');
    }
  }

  async function initLots() {
    var table = document.querySelector('[data-lotes-table]');
    if (!table) return;
    var tbody = table.querySelector('tbody');
    var empty = document.querySelector('[data-lote-empty]');
    var search = document.querySelector('[data-lote-search]');
    var toggleSearch = document.querySelector('[data-lote-search-toggle]');
    var searchWrap = document.querySelector('[data-lote-search-wrap]');
    var toggleFilters = document.querySelector('[data-lote-filtros-toggle]');
    var filterPanel = document.querySelector('[data-lote-filtros]');
    var activeFilter = 'todos';
    var page = 1;
    var pageSize = 25;
    var total = 0;
    var footer = document.querySelector('.table-card__foot > span');
    var prev = document.querySelector('[data-page-prev]');
    var next = document.querySelector('[data-page-next]');

    function renderRows(lots) {
      tbody.innerHTML = lots.length ? lots.map(function (lot) {
        var status = lot.status_validade || 'valido';
        var statusText = status === 'vencido' ? '⛔ Vencido' : status === 'proximo' ? '⚠ Vencimento próximo' : status === 'zerado' ? 'Sem saldo' : '✓ Dentro da validade';
        var badge = status === 'vencido' ? 'badge--danger' : status === 'proximo' ? 'badge--warning' : status === 'zerado' ? 'badge--purple' : 'badge--blue';
        var rowClass = status === 'vencido' ? 'is-danger' : status === 'proximo' ? 'is-warning' : '';
        return '<tr class="' + rowClass + '">' +
          '<td><div class="row gap-12"><span class="lotes-table__icon">📦</span><div><p class="lotes-table__title">' + ui.escape(lot.nome_produto || 'Produto') + '</p><p class="lotes-table__sub">ID do produto: ' + ui.escape(lot.id_produto) + '</p></div></div></td>' +
          '<td>' + ui.escape(lot.lote_producao) + ' <small>#' + ui.escape(lot.id_estoque) + '</small></td>' +
          '<td>' + ui.escape(ui.formatDate(lot.data_entrada)) + '</td>' +
          '<td>' + ui.escape(ui.formatDate(lot.data_validade)) + '</td>' +
          '<td><span class="badge ' + badge + '">' + ui.escape(statusText) + '</span></td>' +
          '<td>' + ui.escape(lot.quantidade) + ' un.</td>' +
          '</tr>';
      }).join('') : ui.emptyRow(6, 'Nenhum lote encontrado para os filtros selecionados.');
      if (empty) empty.hidden = lots.length > 0;
    }

    async function load() {
      tbody.innerHTML = ui.emptyRow(6, 'Carregando lotes...');
      var params = new URLSearchParams({ status: activeFilter, limit: String(pageSize), offset: String((page - 1) * pageSize) });
      if (search && search.value.trim()) params.set('buscar', search.value.trim());
      try {
        var result = await api.get('/lotes?' + params.toString());
        total = Number(result.total || 0);
        renderRows(result.lotes || []);
        if (footer) footer.textContent = total ? 'Mostrando ' + ((page - 1) * pageSize + 1) + ' a ' + Math.min(page * pageSize, total) + ' de ' + total + ' lotes' : 'Nenhum lote cadastrado';
        if (prev) prev.disabled = page <= 1;
        if (next) next.disabled = page * pageSize >= total;
      } catch (error) {
        tbody.innerHTML = ui.emptyRow(6, 'Não foi possível carregar os lotes.');
        ui.toast(error.message, 'error');
      }
    }

    try {
      var summaryResult = await api.get('/estoques/resumo');
      var summary = summaryResult.resumo || {};
      var kpis = document.querySelectorAll('.kpi-card__value');
      if (kpis[0]) kpis[0].textContent = summary.lotes_com_saldo || 0;
      if (kpis[1]) kpis[1].textContent = summary.vencimento_em_7_dias || 0;
      if (kpis[2]) kpis[2].textContent = summary.lotes_vencidos || 0;
    } catch (error) {
      ui.toast(error.message, 'error');
    }

    if (toggleFilters && filterPanel) toggleFilters.addEventListener('click', function () { filterPanel.hidden = !filterPanel.hidden; });
    if (toggleSearch && searchWrap) toggleSearch.addEventListener('click', function () { searchWrap.hidden = !searchWrap.hidden; if (!searchWrap.hidden && search) search.focus(); });
    document.querySelectorAll('[data-lote-filter]').forEach(function (button) {
      button.addEventListener('click', function () {
        activeFilter = button.dataset.loteFilter;
        page = 1;
        document.querySelectorAll('[data-lote-filter]').forEach(function (item) { item.classList.toggle('is-active', item === button); });
        load();
      });
    });
    var timer;
    if (search) search.addEventListener('input', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(function () { page = 1; load(); }, 250);
    });
    if (prev) prev.addEventListener('click', function () { if (page > 1) { page -= 1; load(); } });
    if (next) next.addEventListener('click', function () { if (page * pageSize < total) { page += 1; load(); } });
    await load();
  }

  app.pages = app.pages || {};
  app.pages.initStock = function () {
    initStockEntry();
    initStockExit();
    initStockOverview();
    initLots();
  };
})(window, document);
