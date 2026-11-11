import { api, publicFileUrl } from '../core/api.js';
import { getSession } from '../core/session.js';
import { toast, escapeHtml, formatCurrency, formatDate, dateForInput, setButtonLoading, hasPermission } from '../core/ui.js';

export async function initSalesListPage() {
  const grid = document.querySelector('[data-order-grid]');
  if (!grid) return;
  const search = document.querySelector('[data-pedido-search]');
  const empty = document.querySelector('[data-empty-state]');
  const count = document.querySelector('[data-sales-count]');
  let delay;

  const load = async () => {
    try {
      const result = await api.get('/vendas', { buscar: search?.value.trim() });
      const sales = result.vendas || [];
      if (count) count.textContent = `🧺 ${Number(result.total || sales.length)} venda(s)`;
      grid.innerHTML = sales.map(sale => `
        <article class="card order-card" data-numero="${sale.id_venda}" data-comprador="${escapeHtml(sale.comprador)}">
          <div class="order-card__head"><a data-sale-link href="venda-detalhe.html?id=${encodeURIComponent(sale.id_venda)}" style="color:inherit;text-decoration:none"><strong>Venda #${sale.id_venda}</strong></a></div>
          <div class="order-card__row"><span>👤 Comprador</span><strong data-list-value="buyer">${escapeHtml(sale.comprador)}</strong></div>
          <div class="order-card__row"><span>💰 Valor total</span><strong data-list-value="total">${formatCurrency(sale.valor_total)}</strong></div>
          <div class="order-card__foot"><span>📅 Data do pedido<br><strong>${formatDate(sale.data_pedido)}</strong></span><span><span>🚚 Data de entrega</span><br><strong>${formatDate(sale.data_entrega)}</strong></span></div>
        </article>`).join('');
      if (empty) empty.hidden = sales.length > 0;
    } catch (error) {
      toast(error.message || 'Não foi possível carregar as vendas.', 'error');
      grid.innerHTML = '';
      if (empty) { empty.hidden = false; empty.textContent = 'Não foi possível carregar as vendas.'; }
    }
  };
  search?.addEventListener('input', () => { clearTimeout(delay); delay = setTimeout(load, 250); });
  await load();
}

export async function initSaleDetailPage() {
  const card = document.querySelector('[data-sale-card]');
  if (!card) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    toast('Venda não informada.', 'error');
    location.replace('vendas.html');
    return;
  }

  const template = document.querySelector('[data-sale-item-template]');
  const itemsContainer = document.querySelector('[data-sale-items]');
  const editButton = document.querySelector('[data-sale-edit]');
  const actions = document.querySelector('[data-sale-actions]');
  const invoiceInput = document.querySelector('[data-sale-invoice]');
  const canEdit = hasPermission('manage-sales', getSession()?.funcionario?.setor);
  if (!canEdit) editButton?.remove();

  let sale = null;
  let editing = false;

  const renderItems = () => {
    if (!itemsContainer || !template) return;
    itemsContainer.innerHTML = '';
    (sale.itens || []).forEach((item, index) => {
      const fragment = template.content.cloneNode(true);
      const row = fragment.querySelector('[data-sale-item]');
      row.querySelector('[data-sale-item-heading]').textContent = item.nome_produto || `Produto ${index + 1}`;
      const stockId = row.querySelector('[data-sale-item-input="stockId"]');
      const quantity = row.querySelector('[data-sale-item-input="quantity"]');
      const unitPrice = row.querySelector('[data-sale-item-input="unitPrice"]');
      stockId.value = item.id_estoque;
      quantity.value = item.quantidade_venda_item;
      unitPrice.value = Number(item.preco_unitario).toFixed(2);
      row.querySelector('[data-sale-item-value="stockId"]').textContent = `#${item.id_estoque} · ${item.lote_producao || 'Lote'}`;
      row.querySelector('[data-sale-item-value="quantity"]').textContent = `${item.quantidade_venda_item} un.`;
      row.querySelector('[data-sale-item-value="unitPrice"]').textContent = formatCurrency(item.preco_unitario);
      row.querySelector('[data-sale-item-value="subtotal"]').textContent = formatCurrency(item.quantidade_venda_item * item.preco_unitario);
      itemsContainer.append(fragment);
    });
    updateEditState();
  };

  const updateEditState = () => {
    card.querySelectorAll('[data-sale-input]').forEach(input => {
      const key = input.dataset.saleInput;
      input.style.display = editing ? 'block' : 'none';
      input.disabled = !editing || key === 'employeeRegistration';
      const display = card.querySelector(`[data-sale-value="${key}"]`);
      if (display) display.style.display = editing ? 'none' : '';
    });
    itemsContainer?.querySelectorAll('[data-sale-item]').forEach(row => {
      row.querySelectorAll('[data-sale-item-input]').forEach(input => {
        input.disabled = !editing;
        input.style.display = editing ? 'block' : 'none';
      });
      row.querySelectorAll('[data-sale-item-value]').forEach(value => { value.style.display = editing ? 'none' : ''; });
      const remove = row.querySelector('[data-sale-remove-item]');
      if (remove) remove.style.display = editing ? 'inline-flex' : 'none';
    });
    if (invoiceInput) { invoiceInput.disabled = !editing; invoiceInput.style.display = editing ? 'block' : 'none'; }
    if (actions) actions.style.display = editing ? 'flex' : 'none';
    if (editButton) editButton.hidden = editing;
    const add = document.querySelector('[data-sale-add-item]');
    if (add) add.style.display = editing ? 'inline-flex' : 'none';
  };

  const fill = async () => {
    const result = await api.get(`/vendas/${encodeURIComponent(id)}`);
    sale = result.venda;
    document.title = `SweetLog — Venda #${sale.id_venda}`;
    const heading = document.querySelector('[data-sale-page-heading]');
    if (heading) heading.textContent = `Detalhes da venda #${sale.id_venda}`;
    document.querySelector('[data-sale-heading]')?.replaceChildren(document.createTextNode(`Venda #${sale.id_venda}`));
    const set = (key, value) => {
      const input = card.querySelector(`[data-sale-input="${key}"]`);
      const output = card.querySelector(`[data-sale-value="${key}"]`);
      if (input) input.value = value ?? '';
      if (output) output.textContent = value || '—';
    };
    set('buyer', sale.comprador);
    set('total', `Total: ${formatCurrency(sale.valor_total)}`);
    set('employeeRegistration', sale.numero_matricula || '—');
    set('orderDate', dateForInput(sale.data_pedido));
    set('deliveryDate', dateForInput(sale.data_entrega));
    const orderText = card.querySelector('[data-sale-value="orderDate"]');
    if (orderText) orderText.textContent = formatDate(sale.data_pedido);
    const deliveryText = card.querySelector('[data-sale-value="deliveryDate"]');
    if (deliveryText) deliveryText.textContent = formatDate(sale.data_entrega);
    const invoiceLink = document.querySelector('[data-sale-download]');
    if (invoiceLink) {
      invoiceLink.href = publicFileUrl(sale.nota_fiscal);
      invoiceLink.hidden = !sale.nota_fiscal;
      invoiceLink.target = '_blank';
      invoiceLink.rel = 'noopener';
      invoiceLink.download = `nota-fiscal-venda-${sale.id_venda}.pdf`;
    }
    const invoiceName = document.querySelector('[data-sale-invoice-name]');
    if (invoiceName) invoiceName.textContent = sale.nota_fiscal ? 'Nota fiscal anexada. Selecione um PDF apenas para substituí-la.' : 'Nenhuma nota anexada.';
    renderItems();
  };

  try { await fill(); }
  catch (error) { toast(error.message || 'Não foi possível carregar a venda.', 'error'); return; }

  editButton?.addEventListener('click', () => { editing = true; updateEditState(); });
  document.querySelector('[data-sale-cancel]')?.addEventListener('click', async () => {
    editing = false;
    invoiceInput.value = '';
    await fill();
    updateEditState();
  });
  document.querySelector('[data-sale-add-item]')?.addEventListener('click', () => {
    const fragment = template.content.cloneNode(true);
    const row = fragment.querySelector('[data-sale-item]');
    row.querySelector('[data-sale-item-heading]').textContent = 'Novo item';
    row.querySelectorAll('[data-sale-item-value]').forEach(value => value.textContent = '—');
    row.querySelector('[data-sale-item-input="quantity"]').value = '1';
    row.querySelector('[data-sale-item-input="unitPrice"]').value = '0';
    row.querySelector('[data-sale-remove-item]').style.display = 'inline-flex';
    row.querySelector('[data-sale-remove-item]').addEventListener('click', () => row.remove());
    itemsContainer.append(fragment);
    updateEditState();
  });
  itemsContainer?.addEventListener('click', event => {
    const remove = event.target.closest('[data-sale-remove-item]');
    if (remove) remove.closest('[data-sale-item]')?.remove();
  });

  document.querySelector('[data-sale-save]')?.addEventListener('click', async event => {
    const buyer = card.querySelector('[data-sale-input="buyer"]')?.value.trim();
    const orderDate = card.querySelector('[data-sale-input="orderDate"]')?.value;
    const deliveryDate = card.querySelector('[data-sale-input="deliveryDate"]')?.value;
    const rows = [...itemsContainer.querySelectorAll('[data-sale-item]')];
    const items = rows.map(row => ({
      id_estoque: Number(row.querySelector('[data-sale-item-input="stockId"]')?.value),
      quantidade_venda_item: Number(row.querySelector('[data-sale-item-input="quantity"]')?.value),
      preco_unitario: Number(row.querySelector('[data-sale-item-input="unitPrice"]')?.value)
    }));
    if (!buyer || !orderDate || !items.length || items.some(item => !Number.isInteger(item.id_estoque) || item.id_estoque <= 0 || !Number.isInteger(item.quantidade_venda_item) || item.quantidade_venda_item <= 0 || !Number.isFinite(item.preco_unitario) || item.preco_unitario < 0)) {
      toast('Confira os dados da venda e os itens informados.', 'error');
      return;
    }
    const button = event.currentTarget;
    setButtonLoading(button, true, 'Salvando...');
    try {
      const data = new FormData();
      data.append('comprador', buyer);
      data.append('data_pedido', orderDate);
      data.append('data_entrega', deliveryDate || '');
      data.append('itens', JSON.stringify(items));
      if (invoiceInput?.files?.[0]) data.append('nota_fiscal', invoiceInput.files[0]);
      const result = await api.put(`/vendas/${encodeURIComponent(id)}`, data);
      toast(result.mensagem || 'Venda atualizada.', 'success');
      editing = false;
      invoiceInput.value = '';
      await fill();
    } catch (error) { toast(error.message || 'Não foi possível atualizar a venda.', 'error'); }
    finally { setButtonLoading(button, false); }
  });

  if (canEdit && !document.querySelector('[data-sale-delete]')) {
    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.className = 'btn btn--outline';
    removeButton.dataset.saleDelete = '';
    removeButton.textContent = 'Excluir venda';
    editButton?.after(removeButton);
    removeButton.addEventListener('click', async () => {
      if (!confirm('Excluir esta venda? As quantidades dos lotes serão estornadas pelo backend.')) return;
      try {
        await api.delete(`/vendas/${encodeURIComponent(id)}`);
        toast('Venda excluída e estoque estornado.', 'success');
        location.href = 'vendas.html';
      } catch (error) { toast(error.message || 'Não foi possível excluir a venda.', 'error'); }
    });
  }
}

export async function initDailyBalancePage() {
  const main = document.querySelector('.saldo-grid');
  if (!main) return;
  try {
    const [summaryResult, historyResult] = await Promise.all([
      api.get('/saldo-diario/resumo'),
      api.get('/saldo-diario/historico', { dias: 10 })
    ]);
    const summary = summaryResult.saldo || {};
    const bestSales = main.querySelector('.saldo-panel');
    if (bestSales) {
      const items = summary.maiores_vendas || [];
      bestSales.innerHTML = `<h3 class="saldo-panel__title">⭐ Produtos com maior faturamento hoje</h3>${items.length ? items.map(item => `<div class="sale-row"><span class="sale-row__icon">🥐</span><div class="sale-row__info"><p class="sale-row__title">${escapeHtml(item.nome_produto)}</p><small>${Number(item.quantidade_vendida || 0)} unidade(s)</small></div><strong>${formatCurrency(item.valor_total)}</strong></div>`).join('') : '<p class="empty-state">Nenhuma venda registrada hoje.</p>'}`;
    }
    const panels = main.querySelectorAll('.saldo-panel');
    const moneyPanel = [...panels].find(panel => panel.querySelector('.saldo-value'));
    if (moneyPanel) {
      moneyPanel.querySelector('.saldo-value').textContent = formatCurrency(summary.faturamento_bruto);
      const badge = moneyPanel.querySelector('.badge');
      if (badge) {
        const variation = summary.variacao_percentual;
        badge.textContent = variation === null ? 'Sem base de comparação' : `${variation >= 0 ? '+' : ''}${variation}% vs. ontem`;
        badge.className = `badge ${variation !== null && variation >= 0 ? 'badge--success' : 'badge--warning'}`;
      }
      const details = document.createElement('p');
      details.className = 'kpi-card__note';
      details.textContent = `${Number(summary.total_vendas || 0)} venda(s) · ${Number(summary.itens_vendidos || 0)} unidade(s) vendida(s)`;
      moneyPanel.append(details);
    }
    const history = historyResult.historico || [];
    const chart = main.querySelector('.chart-bars');
    const axis = main.querySelector('.chart-axis');
    if (chart) {
      const max = Math.max(1, ...history.map(day => Number(day.faturamento_bruto || 0)));
      chart.innerHTML = history.map((day, index) => {
        const height = Math.max(3, Number(day.faturamento_bruto || 0) / max * 100);
        return `<span class="${index === history.length - 1 ? 'is-highlight' : ''}" style="height:${height}%" title="${formatDate(day.data)}: ${formatCurrency(day.faturamento_bruto)}"></span>`;
      }).join('');
    }
    if (axis) axis.innerHTML = history.map(day => `<span>${formatDate(day.data).slice(0, 5)}</span>`).join('');
    const title = document.querySelector('main.page .page-head p');
    if (title) title.textContent = `Resumo de ${formatDate(summary.data)}`;
    const extras = document.createElement('div');
    extras.className = 'card saldo-panel';
    extras.innerHTML = `<h3 class="saldo-panel__title">Vendas do dia</h3>${(summary.vendas || []).length ? `<div class="table-scroll"><table class="lotes-table"><thead><tr><th>Venda</th><th>Comprador</th><th>Itens</th><th>Total</th></tr></thead><tbody>${summary.vendas.map(sale => `<tr><td>#${sale.id_venda}</td><td>${escapeHtml(sale.comprador)}</td><td>${sale.quantidade_itens}</td><td>${formatCurrency(sale.valor_total)}</td></tr>`).join('')}</tbody></table></div>` : '<p>Nenhuma venda registrada hoje.</p>'}`;
    main.after(extras);
  } catch (error) { toast(error.message || 'Não foi possível carregar o saldo diário.', 'error'); }

  document.querySelector('[data-export-btn]')?.addEventListener('click', async event => {
    const button = event.currentTarget;
    setButtonLoading(button, true, 'Exportando...');
    try {
      const blob = await api.file('/saldo-diario/exportar');
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `saldo-diario-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) { toast(error.message || 'Não foi possível exportar o relatório.', 'error'); }
    finally { setButtonLoading(button, false); }
  });
}
