import { api, publicFileUrl } from '../core/api.js';
import { getSession } from '../core/session.js';
import { toast, escapeHtml, formatDate, dateForInput, setButtonLoading, formatCurrency, hasPermission } from '../core/ui.js';

const roleCanWriteStock = () => hasPermission('write-stock', getSession()?.funcionario?.setor);

export async function initStockHomePage() {
  const main = document.querySelector('main.page--center');
  if (!main) return;
  try {
    const summaryResult = await api.get('/estoques/resumo');
    const summary = summaryResult.resumo || {};
    const section = document.createElement('section');
    section.style.width = '100%';
    section.innerHTML = `
      <h2 class="section-title">Resumo do estoque</h2>
      <div class="kpi-grid">
        <div class="card kpi-card"><p class="kpi-card__label">Lotes cadastrados</p><p class="kpi-card__value">${Number(summary.total_lotes || 0)}</p></div>
        <div class="card kpi-card"><p class="kpi-card__label">Unidades disponíveis</p><p class="kpi-card__value">${Number(summary.quantidade_disponivel || 0)}</p></div>
        <div class="card kpi-card"><p class="kpi-card__label">Vencendo em 7 dias</p><p class="kpi-card__value">${Number(summary.vencimento_em_7_dias || 0)}</p></div>
      </div>
      <div class="card table-card" style="margin-top:24px">
        <div class="table-card__head"><h3>Movimentações recentes</h3><a href="lotes.html">Ver lotes</a></div>
        <div class="filter-chips movement-filters" data-movement-filters aria-label="Filtrar movimentações">
          <button type="button" class="filter-chip is-active" data-movement-filter="">Todas</button>
          <button type="button" class="filter-chip" data-movement-filter="Entrada">Entrada</button>
          <button type="button" class="filter-chip" data-movement-filter="Venda">Venda</button>
          <button type="button" class="filter-chip" data-movement-filter="Estorno">Estorno</button>
          <button type="button" class="filter-chip" data-movement-filter="Ajuste">Ajuste</button>
          <button type="button" class="filter-chip" data-movement-filter="Baixa">Baixa</button>
        </div>
        <div class="table-scroll"><table class="lotes-table"><thead><tr><th>Data</th><th>Movimentação</th><th>Produto</th><th>Quantidade</th><th>Responsável</th></tr></thead><tbody data-recent-movements></tbody></table></div>
      </div>`;
    main.append(section);
    const tbody = section.querySelector('[data-recent-movements]');
    const filters = section.querySelector('[data-movement-filters]');
    const badgeClasses = { Entrada: 'badge--success', Venda: 'badge--blue', Estorno: 'badge--purple', Ajuste: 'badge--warning', Baixa: 'badge--danger' };
    const loadMovements = async tipo => {
      try {
        const result = await api.get('/estoques/movimentacoes', { tipo: tipo || undefined, limit: 8, offset: 0 });
        const movements = result.movimentacoes || [];
        tbody.innerHTML = movements.length ? movements.map(item => {
          const type = String(item.tipo || '');
          const badgeClass = badgeClasses[type] || 'badge--purple';
          return `<tr><td>${formatDate(item.criado_em)}</td><td><span class="badge ${badgeClass}">${escapeHtml(type)}</span></td><td>${escapeHtml(item.nome_produto || `Produto #${item.id_produto || '—'}`)}</td><td>${Number(item.quantidade || 0)}</td><td>${escapeHtml(item.nome_responsavel || '—')}</td></tr>`;
        }).join('') : '<tr><td colspan="5">Nenhuma movimentação encontrada para este filtro.</td></tr>';
      } catch (error) {
        toast(error.message || 'Não foi possível carregar as movimentações.', 'error');
        tbody.innerHTML = '<tr><td colspan="5">Não foi possível carregar as movimentações.</td></tr>';
      }
    };
    filters.addEventListener('click', event => {
      const button = event.target.closest('[data-movement-filter]');
      if (!button) return;
      filters.querySelectorAll('[data-movement-filter]').forEach(item => {
        const selected = item === button;
        item.classList.toggle('is-active', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      loadMovements(button.dataset.movementFilter);
    });
    loadMovements('');
  } catch (error) {
    toast(error.message || 'Não foi possível carregar o resumo do estoque.', 'error');
  }
}

export async function initStockEntryPage() {
  const form = document.querySelector('[data-entrada-form]');
  if (!form) return;
  if (!hasPermission('enter-stock', getSession()?.funcionario?.setor)) {
    toast('Seu cargo não pode registrar entradas de estoque.', 'error');
    location.replace('estoque.html');
    return;
  }
  const productSelect = form.querySelector('#produto');
  try {
    const result = await api.get('/produtos');
    productSelect.innerHTML = '<option value="" selected disabled>Selecione um produto...</option>' +
      (result.produtos || []).map(product => `<option value="${product.id_produto}">${escapeHtml(product.nome)} (ID ${product.id_produto})</option>`).join('');
  } catch (error) { toast(error.message || 'Não foi possível carregar os produtos.', 'error'); }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(form);
    const invoice = data.get('nota_fiscal');
    const date = form.querySelector('#validade')?.value;
    if (!data.get('id_produto') || !data.get('quantidade') || !data.get('lote_producao') || !date || !(invoice instanceof File) || !invoice.name) {
      toast('Preencha todos os campos e anexe a nota fiscal em PDF.', 'error');
      return;
    }
    data.set('data_entrada', new Date().toISOString().slice(0, 10));
    data.set('inspecionado', form.querySelector('[name="inspecionado"]:checked')?.value || 'false');
    const button = form.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Registrando...');
    try {
      const result = await api.post('/estoques', data);
      toast(result.mensagem || 'Entrada registrada com sucesso.', 'success');
      location.href = 'lotes.html';
    } catch (error) { toast(error.message || 'Não foi possível registrar a entrada.', 'error'); }
    finally { setButtonLoading(button, false); }
  });
}

function updateSaleTotal(container) {
  const total = [...container.querySelectorAll('[data-item-field="quantidade_venda_item"]')].reduce((sum, quantityInput) => {
    const row = quantityInput.closest('[data-saida-item]');
    const price = Number(row?.querySelector('[data-item-field="preco_unitario"]')?.value || 0);
    return sum + Number(quantityInput.value || 0) * price;
  }, 0);
  const output = document.querySelector('[data-saida-total]');
  if (output) output.textContent = `Valor total estimado: ${formatCurrency(total)}`;
}

export async function initStockExitPage() {
  const form = document.querySelector('[data-saida-form]');
  if (!form) return;
  if (!roleCanWriteStock()) {
    toast('Seu cargo não pode registrar saídas de estoque.', 'error');
    location.replace('estoque.html');
    return;
  }

  const kind = form.querySelector('[data-saida-tipo]');
  const saleFields = form.querySelector('[data-saida-venda-fields]');
  const itemsContainer = form.querySelector('[data-saida-items]');
  const invoice = form.querySelector('[name="nota_fiscal"]');
  const buyer = form.querySelector('[name="comprador"]');
  const orderDate = form.querySelector('[name="data_pedido"]');
  const addItem = form.querySelector('[data-add-saida-item]');
  const hint = form.querySelector('[data-saida-itens-hint]');
  const today = new Date().toISOString().slice(0, 10);
  if (orderDate && !orderDate.value) orderDate.value = today;
  let stocks = [];

  try {
    const result = await api.get('/estoques');
    stocks = (result.estoques || []).filter(stock =>
      Number(stock.quantidade) > 0 &&
      stock.status_validade !== 'vencido' &&
      stock.status_validade !== 'zerado'
    );
  } catch (error) { toast(error.message || 'Não foi possível consultar os lotes disponíveis.', 'error'); }

  const stockOptions = selected => {
    if (!stocks.length) return '<option value="" selected>Nenhum lote disponível para saída</option>';
    return '<option value="">Selecione um estoque/lote...</option>' + stocks.map(stock => {
      const validade = stock.data_validade ? ` · validade ${formatDate(stock.data_validade)}` : '';
      const label = `#${stock.id_estoque} · ${stock.nome_produto} · lote ${stock.lote_producao} · ${stock.quantidade} un.${validade}`;
      return `<option value="${stock.id_estoque}" ${String(selected) === String(stock.id_estoque) ? 'selected' : ''}>${escapeHtml(label)}</option>`;
    }).join('');
  };

  function enhanceRow(row, index) {
    const oldStockInput = row.querySelector('[data-item-field="id_estoque"]');
    if (oldStockInput && oldStockInput.tagName !== 'SELECT') {
      const select = document.createElement('select');
      select.className = 'input';
      select.id = `item-${index}-stock`;
      select.dataset.itemField = 'id_estoque';
      select.required = true;
      select.innerHTML = stockOptions(oldStockInput.value);
      select.disabled = stocks.length === 0;
      oldStockInput.replaceWith(select);
    }
    row.querySelectorAll('[data-item-field]').forEach(input => {
      if (input.dataset.itemField === 'quantidade_venda_item') input.addEventListener('input', () => updateSaleTotal(itemsContainer));
      if (input.dataset.itemField === 'preco_unitario') input.addEventListener('input', () => updateSaleTotal(itemsContainer));
    });
    const remove = row.querySelector('[data-remove-saida-item]');
    remove?.addEventListener('click', () => { row.remove(); updateRemoveButtons(); updateSaleTotal(itemsContainer); });
  }
  function updateRemoveButtons() {
    const rows = [...itemsContainer.querySelectorAll('[data-saida-item]')];
    rows.forEach(row => { const button = row.querySelector('[data-remove-saida-item]'); if (button) button.hidden = rows.length < 2; });
  }
  function applyType() {
    const isSale = kind.value === 'venda';
    if (saleFields) saleFields.hidden = !isSale;
    if (invoice) { invoice.required = isSale; invoice.disabled = !isSale; }
    if (buyer) { buyer.required = isSale; buyer.disabled = !isSale; }
    if (orderDate) { orderDate.required = isSale; orderDate.disabled = !isSale; }
    form.querySelectorAll('[data-item-price-field]').forEach(field => { field.hidden = !isSale; });
    form.querySelectorAll('[data-item-field="preco_unitario"]').forEach(field => { field.required = isSale; field.disabled = !isSale; });
    if (hint) {
      if (!stocks.length) {
        hint.textContent = `Não há lotes com saldo e dentro da validade disponíveis para ${isSale ? 'venda' : 'saída'}.`;
      } else {
        hint.textContent = isSale
          ? 'Selecione o produto e o lote corretos pela quantidade e validade; lotes válidos próximos do vencimento também aparecem.'
          : 'Selecione os lotes que terão baixa. A quantidade será descontada de cada lote.';
      }
    }
    updateSaleTotal(itemsContainer);
  }

  const firstRow = itemsContainer?.querySelector('[data-saida-item]');
  if (firstRow) enhanceRow(firstRow, 0);
  if (addItem) addItem.disabled = stocks.length === 0;
  addItem?.addEventListener('click', () => {
    const currentRows = [...itemsContainer.querySelectorAll('[data-saida-item]')];
    const row = currentRows[0]?.cloneNode(true);
    if (!row) return;
    row.querySelectorAll('input,select').forEach(input => {
      if (input.dataset.itemField === 'id_estoque') input.value = '';
      else if (input.dataset.itemField === 'quantidade_venda_item') input.value = '1';
      else if (input.dataset.itemField === 'preco_unitario') input.value = '0';
    });
    row.querySelectorAll('[id]').forEach(element => { element.id = element.id.replace(/item-\d+-/, `item-${currentRows.length}-`); });
    const stockLabel = row.querySelector('[data-item-label="stock"]');
    if (stockLabel) stockLabel.htmlFor = `item-${currentRows.length}-stock`;
    itemsContainer.append(row);
    enhanceRow(row, currentRows.length);
    updateRemoveButtons();
    applyType();
  });
  kind?.addEventListener('change', applyType);
  updateRemoveButtons();
  applyType();

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const isSale = kind.value === 'venda';
    const rows = [...itemsContainer.querySelectorAll('[data-saida-item]')];
    if (!rows.length || rows.some(row => !row.querySelector('[data-item-field="id_estoque"]')?.value || Number(row.querySelector('[data-item-field="quantidade_venda_item"]')?.value) <= 0)) {
      toast('Selecione um lote e uma quantidade válida para cada item.', 'error');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Registrando...');
    try {
      if (isSale) {
        const data = new FormData();
        data.append('comprador', buyer.value.trim());
        data.append('data_pedido', orderDate.value);
        data.append('itens', JSON.stringify(rows.map(row => ({
          id_estoque: Number(row.querySelector('[data-item-field="id_estoque"]').value),
          quantidade_venda_item: Number(row.querySelector('[data-item-field="quantidade_venda_item"]').value),
          preco_unitario: Number(row.querySelector('[data-item-field="preco_unitario"]').value)
        }))));
        data.append('nota_fiscal', invoice.files[0]);
        const result = await api.post('/vendas', data);
        toast(result.mensagem || 'Venda registrada com sucesso.', 'success');
        location.href = `venda-detalhe.html?id=${encodeURIComponent(result.venda?.id_venda || result.id)}`;
      } else {
        let completed = 0;
        for (const row of rows) {
          const id = row.querySelector('[data-item-field="id_estoque"]').value;
          const quantity = Number(row.querySelector('[data-item-field="quantidade_venda_item"]').value);
          const reason = form.querySelector('[name="motivo_baixa"]')?.value || 'Baixa manual de estoque';
          await api.post(`/estoques/${encodeURIComponent(id)}/saida`, { quantidade: quantity, motivo: reason });
          completed += 1;
        }
        toast(`${completed} baixa(s) registrada(s) com sucesso.`, 'success');
        location.href = 'lotes.html';
      }
    } catch (error) {
      toast(error.message || 'Não foi possível registrar a saída.', 'error');
    } finally { setButtonLoading(button, false); }
  });
}

export async function initLotsPage() {
  const table = document.querySelector('[data-lotes-table]');
  if (!table) return;
  const tbody = table.querySelector('tbody');
  const canEdit = hasPermission('manage-stock', getSession()?.funcionario?.setor);
  const actionsHeading = document.querySelector('[data-lote-actions-heading]');
  if (actionsHeading) actionsHeading.hidden = !canEdit;
  const empty = document.querySelector('[data-lote-empty]');
  const search = document.querySelector('[data-lote-search]');
  const pagination = document.querySelector('[data-pagination]');
  let status = 'todos';
  let offset = 0;
  const limit = 50;
  let currentTotal = 0;
  let loadedLots = [];

  const dialog = canEdit ? document.createElement('dialog') : null;
  const dialogForm = canEdit ? document.createElement('form') : null;
  if (dialog && dialogForm) {
    dialog.style.cssText = 'border:0;border-radius:16px;padding:24px;width:min(92vw,560px);box-shadow:0 20px 60px #0003';
    dialogForm.innerHTML = `
      <h2 style="margin:0 0 16px">Editar lote</h2>
      <div class="stack gap-16">
        <div class="grupo-campo"><label for="lot-edit-code">Número do lote</label><input class="input" id="lot-edit-code" name="lote_producao" maxlength="100" required></div>
        <div class="form-grid">
          <div class="grupo-campo"><label for="lot-edit-entry">Data de entrada</label><input class="input" id="lot-edit-entry" name="data_entrada" type="date"></div>
          <div class="grupo-campo"><label for="lot-edit-expiry">Data de validade</label><input class="input" id="lot-edit-expiry" name="data_validade" type="date" required></div>
        </div>
        <div class="form-grid">
          <div class="grupo-campo"><label for="lot-edit-quantity">Quantidade disponível</label><input class="input" id="lot-edit-quantity" name="quantidade" type="number" min="0" max="2147483647" step="1" required></div>
          <div class="grupo-campo"><label for="lot-edit-inspected">Inspeção de qualidade</label><select class="input" id="lot-edit-inspected" name="inspecionado"><option value="true">Inspecionado</option><option value="false">Não inspecionado</option></select></div>
        </div>
      </div>
      <div class="form-actions" style="justify-content:flex-end;margin-top:20px"><button class="btn btn--outline" type="button" data-lot-dialog-close>Cancelar</button><button class="btn btn--primary" type="submit">Salvar alterações</button></div>`;
    dialog.append(dialogForm);
    document.body.append(dialog);
    dialog.querySelector('[data-lot-dialog-close]').addEventListener('click', () => dialog.close());
  }

  const openLotEditor = lot => {
    if (!dialogForm) return;
    dialogForm.dataset.id = String(lot.id_estoque);
    dialogForm.elements.namedItem('lote_producao').value = lot.lote_producao || '';
    dialogForm.elements.namedItem('data_entrada').value = dateForInput(lot.data_entrada);
    dialogForm.elements.namedItem('data_validade').value = dateForInput(lot.data_validade);
    dialogForm.elements.namedItem('quantidade').value = Number(lot.quantidade || 0);
    const inspected = lot.inspecionado === true || lot.inspecionado === 1 ||
      lot.inspecionado === '1' || lot.inspecionado === 'true';
    dialogForm.elements.namedItem('inspecionado').value = String(inspected);
    dialog.showModal();
  };

  const renderSummary = async () => {
    const response = await api.get('/lotes/resumo');
    const summary = response.resumo || {};
    const cards = document.querySelectorAll('.kpi-grid .kpi-card');
    const values = [summary.lotes_com_saldo, summary.vencimento_em_7_dias, summary.lotes_vencidos];
    cards.forEach((card, index) => {
      const value = card.querySelector('.kpi-card__value');
      if (value && values[index] !== undefined) value.textContent = Number(values[index] || 0).toLocaleString('pt-BR');
      const note = card.querySelector('.kpi-card__note');
      if (note) note.textContent = index === 0 ? 'Lotes com saldo positivo' : index === 1 ? 'Validade nos próximos 7 dias' : 'Lotes com saldo já vencidos';
    });
  };

  const load = async () => {
    try {
      const result = await api.get('/lotes', { status, buscar: search?.value.trim(), limit, offset });
      const lots = result.lotes || [];
      loadedLots = lots;
      currentTotal = Number(result.total || 0);
      tbody.innerHTML = lots.map(lot => {
        const state = lot.status_validade;
        const statusText = state === 'vencido' ? '⛔ Vencido' : state === 'proximo' ? `⚠️ Vence em ${lot.dias_para_validade} dia(s)` : state === 'zerado' ? 'Sem saldo' : '✔️ Dentro da validade';
        const badge = state === 'vencido' ? 'badge--danger' : state === 'proximo' ? 'badge--warning' : 'badge--blue';
        const rowClass = state === 'vencido' ? 'is-danger' : state === 'proximo' ? 'is-warning' : '';
        return `<tr class="${rowClass}" data-id="${lot.id_estoque}">
          <td><div class="row gap-12"><span class="lotes-table__icon">📦</span><div><p class="lotes-table__title">${escapeHtml(lot.nome_produto || 'Produto')}</p><p class="lotes-table__sub">ID do produto: ${lot.id_produto}</p></div></div></td>
          <td>${escapeHtml(lot.lote_producao || `#${lot.id_estoque}`)} <small>(#${lot.id_estoque})</small></td>
          <td>${formatDate(lot.data_entrada)}</td>
          <td>${formatDate(lot.data_validade)}</td>
          <td><span class="badge ${badge}">${statusText}</span></td>
          <td>${Number(lot.quantidade || 0)}</td>
          ${canEdit ? `<td><button class="btn btn--outline" type="button" data-edit-lot="${lot.id_estoque}">Editar</button></td>` : ''}
        </tr>`;
      }).join('');
      if (empty) empty.hidden = lots.length > 0;
      updatePagination(lots.length);
      const footer = document.querySelector('[data-lotes-footer]') || document.querySelector('.table-card__foot > span');
      if (footer) footer.textContent = currentTotal ? `Mostrando ${offset + 1} a ${offset + lots.length} de ${currentTotal} lotes` : 'Nenhum lote encontrado';
    } catch (error) {
      toast(error.message || 'Não foi possível carregar os lotes.', 'error');
      tbody.innerHTML = '';
      if (empty) empty.hidden = false;
    }
  };

  if (dialogForm) {
    tbody.addEventListener('click', event => {
      const button = event.target.closest('[data-edit-lot]');
      if (!button) return;
      const lot = loadedLots.find(item => String(item.id_estoque) === button.dataset.editLot);
      if (lot) openLotEditor(lot);
    });
    dialogForm.addEventListener('submit', async event => {
      event.preventDefault();
      const formData = new FormData(dialogForm);
      const quantity = Number(formData.get('quantidade'));
      if (!Number.isInteger(quantity) || quantity < 0) {
        toast('A quantidade deve ser um número inteiro igual ou maior que zero.', 'error');
        return;
      }
      const button = dialogForm.querySelector('button[type="submit"]');
      setButtonLoading(button, true, 'Salvando...');
      try {
        const result = await api.put(`/estoques/${encodeURIComponent(dialogForm.dataset.id)}`, {
          lote_producao: String(formData.get('lote_producao')).trim(),
          data_entrada: formData.get('data_entrada') || undefined,
          data_validade: formData.get('data_validade'),
          quantidade: quantity,
          inspecionado: formData.get('inspecionado')
        });
        toast(result.mensagem || 'Lote atualizado com sucesso.', 'success');
        dialog.close();
        await load();
        await renderSummary().catch(error => toast(error.message || 'Não foi possível atualizar o resumo dos lotes.', 'error'));
      } catch (error) {
        toast(error.message || 'Não foi possível atualizar o lote.', 'error');
      } finally {
        setButtonLoading(button, false);
      }
    });
  }

  const updatePagination = count => {
    if (!pagination) return;
    const pages = Math.max(1, Math.ceil(currentTotal / limit));
    const activePage = Math.floor(offset / limit) + 1;
    pagination.innerHTML = `
      <button class="pagination__btn" data-page-prev ${activePage <= 1 ? 'disabled' : ''} ${activePage <= 1 ? 'disabled' : ''}>‹</button>
      <span class="pagination__label">Página ${activePage} de ${pages}</span>
      <button class="pagination__btn" data-page-next ${activePage >= pages || count < limit ? 'disabled' : ''}>›</button>`;
    pagination.querySelector('[data-page-prev]')?.addEventListener('click', () => { if (offset >= limit) { offset -= limit; load(); } });
    pagination.querySelector('[data-page-next]')?.addEventListener('click', () => { if (offset + count < currentTotal) { offset += limit; load(); } });
  };

  document.querySelectorAll('[data-lote-filter]').forEach(button => {
    button.addEventListener('click', () => {
      status = button.dataset.loteFilter || 'todos';
      offset = 0;
      document.querySelectorAll('[data-lote-filter]').forEach(item => item.classList.toggle('is-active', item === button));
      load();
    });
  });
  let searchDelay;
  search?.addEventListener('input', () => {
    clearTimeout(searchDelay);
    searchDelay = setTimeout(() => { offset = 0; load(); }, 250);
  });
  await Promise.all([load(), renderSummary().catch(error => toast(error.message, 'error'))]);
}
