(function (window, document) {
  'use strict';

  var app = window.SweetLog = window.SweetLog || {};
  var api = app.api;
  var ui = app.ui;

  function saleCard(sale) {
    var id = Number(sale.id_venda);
    return '<article class="card order-card" data-numero="' + id + '" data-comprador="' + ui.escape(sale.comprador) + '">' +
      '<div class="order-card__head"><a href="venda-detalhe.html?id=' + id + '" style="color:inherit;text-decoration:none"><strong>Venda #' + id + '</strong></a></div>' +
      '<div class="order-card__row"><span>👤 Comprador</span><strong>' + ui.escape(sale.comprador) + '</strong></div>' +
      '<div class="order-card__row"><span>💰 Valor total</span><strong>' + ui.escape(ui.formatMoney(sale.valor_total)) + '</strong></div>' +
      '<div class="order-card__foot"><span>📅 Data do pedido<br><strong>' + ui.escape(ui.formatDate(sale.data_pedido)) + '</strong></span>' +
      (sale.data_entrega ? '<span>🚚 Data de entrega<br><strong>' + ui.escape(ui.formatDate(sale.data_entrega)) + '</strong></span>' : '') + '</div>' +
      '<a class="btn btn--outline" href="venda-detalhe.html?id=' + id + '">Consultar venda</a></article>';
  }

  async function initSalesList() {
    var grid = document.querySelector('[data-order-grid]');
    if (!grid) return;
    var search = document.querySelector('[data-pedido-search]');
    var count = document.querySelector('[data-sales-count]');
    var empty = document.querySelector('[data-empty-state]');

    async function load() {
      grid.innerHTML = '<p class="muted">Carregando vendas...</p>';
      try {
        var query = search && search.value.trim() ? '?buscar=' + encodeURIComponent(search.value.trim()) : '';
        var result = await api.get('/vendas' + query);
        var sales = result.vendas || [];
        grid.innerHTML = sales.map(saleCard).join('');
        if (count) count.textContent = '🧺 ' + (result.total || sales.length) + ' venda(s)';
        if (empty) empty.hidden = sales.length > 0;
      } catch (error) {
        grid.innerHTML = '<p class="muted">Não foi possível carregar as vendas.</p>';
        ui.toast(error.message, 'error');
      }
    }

    var timer;
    if (search) search.addEventListener('input', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(load, 250);
    });
    await load();
  }

  async function initSaleDetail() {
    var page = document.querySelector('[data-sale-detail]');
    if (!page) return;
    var id = new URLSearchParams(window.location.search).get('id');
    var card = page.querySelector('[data-sale-card]');
    var template = page.querySelector('[data-sale-item-template]');
    var itemsContainer = page.querySelector('[data-sale-items]');
    var fields = {
      comprador: page.querySelector('[data-sale-input="buyer"]'),
      data_pedido: page.querySelector('[data-sale-input="orderDate"]'),
      data_entrega: page.querySelector('[data-sale-input="deliveryDate"]')
    };
    var sale = null;
    var editing = false;

    if (!id || !/^\d+$/.test(id)) {
      ui.toast('Identificador de venda inválido.', 'error');
      window.location.replace('vendas.html');
      return;
    }

    function currentItems() {
      return Array.prototype.slice.call(itemsContainer.querySelectorAll('[data-sale-item]')).map(function (row) {
        return {
          id_estoque: Number(row.querySelector('[data-sale-item-input="stockId"]').value),
          quantidade_venda_item: Number(row.querySelector('[data-sale-item-input="quantity"]').value),
          preco_unitario: Number(row.querySelector('[data-sale-item-input="unitPrice"]').value)
        };
      });
    }

    function refreshTotals() {
      var total = 0;
      itemsContainer.querySelectorAll('[data-sale-item]').forEach(function (row, index) {
        var stock = row.querySelector('[data-sale-item-input="stockId"]');
        var quantity = row.querySelector('[data-sale-item-input="quantity"]');
        var price = row.querySelector('[data-sale-item-input="unitPrice"]');
        var subtotal = Number(quantity.value || 0) * Number(price.value || 0);
        total += subtotal;
        row.querySelector('[data-sale-item-heading]').textContent = 'Produto ' + (index + 1) + (row.dataset.productName ? ' — ' + row.dataset.productName : '');
        row.querySelector('[data-sale-item-value="stockId"]').textContent = stock.value || 'Não informado';
        row.querySelector('[data-sale-item-value="quantity"]').textContent = (quantity.value || '0') + ' un.';
        row.querySelector('[data-sale-item-value="unitPrice"]').textContent = ui.formatMoney(price.value);
        row.querySelector('[data-sale-item-value="subtotal"]').textContent = ui.formatMoney(subtotal);
      });
      var totalOutput = page.querySelector('[data-sale-value="total"]');
      if (totalOutput) totalOutput.textContent = 'Total: ' + ui.formatMoney(total);
    }

    function toggleEditing(nextState) {
      editing = nextState;
      Object.keys(fields).forEach(function (key) {
        var field = fields[key];
        if (!field) return;
        var input = field;
        var output = page.querySelector('[data-sale-value="' + (key === 'comprador' ? 'buyer' : key === 'data_pedido' ? 'orderDate' : 'deliveryDate') + '"]');
        input.style.display = editing ? '' : 'none';
        input.disabled = !editing;
        if (output) output.style.display = editing ? 'none' : '';
      });
      page.querySelectorAll('[data-sale-item-input]').forEach(function (input) {
        input.disabled = !editing;
        input.style.display = editing ? '' : 'none';
      });
      page.querySelectorAll('[data-sale-remove-item]').forEach(function (button) { button.style.display = editing ? '' : 'none'; });
      var add = page.querySelector('[data-sale-add-item]');
      var invoice = page.querySelector('[data-sale-invoice]');
      var actions = page.querySelector('[data-sale-actions]');
      var edit = page.querySelector('[data-sale-edit]');
      if (add) add.style.display = editing ? '' : 'none';
      if (invoice) { invoice.style.display = editing ? '' : 'none'; invoice.disabled = !editing; }
      if (actions) actions.style.display = editing ? 'flex' : 'none';
      if (edit) edit.style.display = editing ? 'none' : '';
      refreshTotals();
    }

    function renderItems(items) {
      itemsContainer.textContent = '';
      (items || []).forEach(function (item) {
        var row = template.content.firstElementChild.cloneNode(true);
        row.querySelector('[data-sale-item-input="stockId"]').value = item.id_estoque;
        row.querySelector('[data-sale-item-input="quantity"]').value = item.quantidade_venda_item;
        row.querySelector('[data-sale-item-input="unitPrice"]').value = Number(item.preco_unitario || 0).toFixed(2);
        row.dataset.productName = item.nome_produto || '';
        row.querySelectorAll('[data-sale-item-input]').forEach(function (input) {
          input.addEventListener('input', refreshTotals);
          input.addEventListener('change', refreshTotals);
        });
        row.querySelector('[data-sale-remove-item]').addEventListener('click', function () {
          if (itemsContainer.querySelectorAll('[data-sale-item]').length > 1) {
            row.remove();
            refreshTotals();
          }
        });
        itemsContainer.appendChild(row);
      });
      refreshTotals();
    }

    function applySale(values) {
      sale = values;
      card.dataset.numero = values.id_venda;
      page.querySelector('[data-sale-page-heading]').textContent = 'Detalhes da venda #' + values.id_venda;
      page.querySelector('[data-sale-heading]').textContent = 'Venda #' + values.id_venda;
      fields.comprador.value = values.comprador || '';
      fields.data_pedido.value = ui.dateOnly(values.data_pedido);
      fields.data_entrega.value = ui.dateOnly(values.data_entrega);
      page.querySelector('[data-sale-value="buyer"]').textContent = values.comprador || 'Não informado';
      page.querySelector('[data-sale-value="orderDate"]').textContent = ui.formatDate(values.data_pedido);
      page.querySelector('[data-sale-value="deliveryDate"]').textContent = values.data_entrega ? ui.formatDate(values.data_entrega) : 'Não informada';
      var delivery = page.querySelector('[data-sale-delivery]');
      if (delivery) delivery.style.display = values.data_entrega ? '' : 'none';
      var employee = page.querySelector('[data-sale-value="employeeRegistration"]');
      if (employee) employee.textContent = values.numero_matricula || 'Não informado';

      var invoiceLink = page.querySelector('[data-sale-download]');
      if (invoiceLink) {
        if (values.nota_fiscal) {
          invoiceLink.href = ui.asset(values.nota_fiscal);
          invoiceLink.target = '_blank';
          invoiceLink.rel = 'noopener';
          invoiceLink.removeAttribute('aria-disabled');
        } else {
          invoiceLink.href = '#';
          invoiceLink.setAttribute('aria-disabled', 'true');
        }
        invoiceLink.download = 'nota-fiscal-venda-' + values.id_venda + '.pdf';
      }
      renderItems(values.itens || []);
    }

    try {
      var response = await api.get('/vendas/' + encodeURIComponent(id));
      if (!response.venda) throw new Error('Venda não encontrada.');
      applySale(response.venda);
    } catch (error) {
      ui.toast(error.message, 'error');
      window.setTimeout(function () { window.location.href = 'vendas.html'; }, 900);
      return;
    }

    var editButton = page.querySelector('[data-sale-edit]');
    var cancelButton = page.querySelector('[data-sale-cancel]');
    var saveButton = page.querySelector('[data-sale-save]');
    var addButton = page.querySelector('[data-sale-add-item]');
    var invoiceInput = page.querySelector('[data-sale-invoice]');

    if (editButton) editButton.addEventListener('click', function () { toggleEditing(true); });
    if (cancelButton) cancelButton.addEventListener('click', function () { applySale(sale); toggleEditing(false); });
    if (addButton) addButton.addEventListener('click', function () {
      var row = template.content.firstElementChild.cloneNode(true);
      row.querySelector('[data-sale-item-input="stockId"]').value = '';
      row.querySelector('[data-sale-item-input="quantity"]').value = '1';
      row.querySelector('[data-sale-item-input="unitPrice"]').value = '0.00';
      row.querySelectorAll('[data-sale-item-input]').forEach(function (input) {
        input.addEventListener('input', refreshTotals);
        input.addEventListener('change', refreshTotals);
      });
      row.querySelector('[data-sale-remove-item]').addEventListener('click', function () { row.remove(); refreshTotals(); });
      itemsContainer.appendChild(row);
      toggleEditing(true);
    });

    if (saveButton) saveButton.addEventListener('click', async function () {
      var items = currentItems();
      if (!fields.comprador.value.trim() || !fields.data_pedido.value || !items.length || items.some(function (item) {
        return !Number.isInteger(item.id_estoque) || item.id_estoque <= 0 || !Number.isInteger(item.quantidade_venda_item) || item.quantidade_venda_item <= 0 || !Number.isFinite(item.preco_unitario) || item.preco_unitario < 0;
      })) {
        ui.toast('Confira comprador, data do pedido e os itens da venda.', 'error');
        return;
      }
      if (fields.data_entrega.value && fields.data_entrega.value < fields.data_pedido.value) {
        ui.toast('A data de entrega não pode ser anterior à data do pedido.', 'error');
        return;
      }
      var body = new FormData();
      body.set('comprador', fields.comprador.value.trim());
      body.set('data_pedido', fields.data_pedido.value);
      body.set('data_entrega', fields.data_entrega.value);
      body.set('itens', JSON.stringify(items));
      if (invoiceInput && invoiceInput.files[0]) {
        var file = invoiceInput.files[0];
        if (file.size > 5 * 1024 * 1024 || (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name))) {
          ui.toast('A nota fiscal deve ser PDF de até 5 MB.', 'error');
          return;
        }
        body.set('nota_fiscal', file);
      }
      ui.setBusy(saveButton, true, 'Salvando...');
      try {
        var result = await api.put('/vendas/' + encodeURIComponent(id), body);
        applySale(result.novaVenda || sale);
        toggleEditing(false);
        ui.toast(result.mensagem || 'Venda atualizada.', 'success');
      } catch (error) {
        ui.toast(error.message, 'error');
      } finally {
        ui.setBusy(saveButton, false);
      }
    });

    var deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn btn--outline';
    deleteButton.textContent = 'Excluir venda';
    deleteButton.style.marginLeft = '8px';
    var actionArea = page.querySelector('[data-sale-actions]');
    var editArea = page.querySelector('[data-sale-edit]');
    if (actionArea && editArea && editArea.parentNode) editArea.parentNode.insertBefore(deleteButton, editArea.nextSibling);
    deleteButton.addEventListener('click', async function () {
      if (!window.confirm('Excluir esta venda? O backend tentará estornar os itens para o estoque.')) return;
      try {
        var result = await api.delete('/vendas/' + encodeURIComponent(id));
        ui.toast(result.mensagem || 'Venda excluída.', 'success');
        window.setTimeout(function () { window.location.href = 'vendas.html'; }, 800);
      } catch (error) {
        ui.toast(error.message, 'error');
      }
    });
    toggleEditing(false);
  }

  app.pages = app.pages || {};
  app.pages.initSales = function () {
    initSalesList();
    initSaleDetail();
  };
})(window, document);
