import { api, publicFileUrl } from '../core/api.js';
import { getSession } from '../core/session.js';
import { toast, escapeHtml, formatDate, setButtonLoading, formatCurrency, hasPermission } from '../core/ui.js';

let productCache = [];

function productStatus(product) {
  const quantity = Number(product.quantidade_disponivel || 0);
  if (quantity <= 20 && Number(product.total_lotes || 0) > 0) return { label: 'Estoque baixo', badge: 'badge--warning' };
  if (quantity <= 0) return { label: 'Sem estoque', badge: 'badge--danger' };
  return { label: 'Em estoque', badge: 'badge--success' };
}

function productCard(product, canManageProducts) {
  const status = productStatus(product);
  const photo = product.imagem
    ? `<img src="${escapeHtml(publicFileUrl(product.imagem))}" alt="${escapeHtml(product.nome)}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`
    : `<span class="product-card__fallback">${product.necessidade_refrigeracao ? '❄️' : '🥐'}</span>`;
  return `
    <a class="product-card" href="produto-detalhe.html?id=${encodeURIComponent(product.id_produto)}" data-nome="${escapeHtml(product.nome)}" data-qtd="${Number(product.quantidade_disponivel || 0)}">
      <div class="product-card__img">
        ${photo}
        <span class="badge ${status.badge} product-card__tag">${status.label}</span>
      </div>
      <div class="product-card__body">
        <h3>${escapeHtml(product.nome)}</h3>
        <p class="muted">${escapeHtml(product.marca || 'Marca não informada')}</p>
        <div class="product-card__foot"><span>Qtd.: ${Number(product.quantidade_disponivel || 0)} un.</span>${canManageProducts ? '<span class="edit-ico">✎</span>' : ''}</div>
      </div>
    </a>`;
}

export async function initProductListPage() {
  const grid = document.querySelector('[data-product-grid]');
  if (!grid) return;
  const search = document.querySelector('[data-produto-search]');
  const empty = document.querySelector('[data-empty-state]');
  const sortMenu = document.querySelector('[data-sort-menu]');
  const canManageProducts = hasPermission('manage-products', getSession()?.funcionario?.setor);
  let sort = 'nome-asc';

  const render = () => {
    const term = (search?.value || '').trim().toLocaleLowerCase('pt-BR');
    const rows = productCache.filter(product => `${product.nome} ${product.marca || ''} ${product.cnpj_fabricante || ''}`.toLocaleLowerCase('pt-BR').includes(term));
    rows.sort((a, b) => {
      if (sort === 'nome-desc') return b.nome.localeCompare(a.nome, 'pt-BR');
      if (sort === 'qtd-desc') return Number(b.quantidade_disponivel || 0) - Number(a.quantidade_disponivel || 0);
      if (sort === 'qtd-asc') return Number(a.quantidade_disponivel || 0) - Number(b.quantidade_disponivel || 0);
      return a.nome.localeCompare(b.nome, 'pt-BR');
    });
    grid.innerHTML = rows.map(product => productCard(product, canManageProducts)).join('');
    if (empty) empty.hidden = rows.length > 0;
  };

  try {
    const result = await api.get('/produtos');
    productCache = result.produtos || [];
    render();
  } catch (error) {
    toast(error.message || 'Não foi possível carregar os produtos.', 'error');
    grid.innerHTML = '';
    if (empty) { empty.hidden = false; empty.textContent = 'Não foi possível carregar os produtos.'; }
  }

  search?.addEventListener('input', render);
  document.querySelector('[data-sort-toggle]')?.addEventListener('click', () => sortMenu?.classList.toggle('is-open'));
  sortMenu?.querySelectorAll('[data-sort]').forEach(button => {
    button.addEventListener('click', () => {
      sort = button.dataset.sort;
      sortMenu.classList.remove('is-open');
      render();
    });
  });
}

export function initProductCreatePage() {
  const form = document.querySelector('[data-produto-form]');
  if (!form) return;
  if (!hasPermission('create-products', getSession()?.funcionario?.setor)) {
    toast('Seu cargo não pode cadastrar produtos.', 'error');
    location.replace('produtos-lista.html');
    return;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(form);
    const button = form.querySelector('button[type="submit"]');
    if (!formData.get('nome') || !formData.get('cnpj_fabricante') || !formData.get('necessidade_refrigeracao')) {
      toast('Preencha os campos obrigatórios.', 'error');
      return;
    }
    setButtonLoading(button, true, 'Cadastrando...');
    try {
      const result = await api.post('/produtos', formData);
      toast(result.mensagem || 'Produto cadastrado com sucesso.', 'success');
      location.href = `produto-detalhe.html?id=${encodeURIComponent(result.produto?.id_produto || result.id)}`;
    } catch (error) {
      toast(error.message || 'Não foi possível cadastrar o produto.', 'error');
    } finally {
      setButtonLoading(button, false);
    }
  });
}

export async function initProductDetailPage() {
  const form = document.querySelector('[data-product-detail-form]');
  if (!form) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!id) {
    toast('Produto não informado.', 'error');
    location.replace('produtos-lista.html');
    return;
  }

  const editButton = document.querySelector('[data-edit-product]');
  const actions = document.querySelector('[data-detail-actions]');
  const canEdit = hasPermission('manage-products', getSession()?.funcionario?.setor);
  if (!canEdit && editButton) editButton.hidden = true;
  let product;
  let imagePreviewUrl = null;

  const ensureFields = () => {
    const card = form.querySelector('.info-card');
    const block = document.createElement('div');
    block.className = 'card info-card';
    block.innerHTML = `
      <h4>📝 Dados do produto</h4>
      <div class="info-row"><span>Nome</span><strong data-detail-value="nome"></strong><input class="input" name="nome" maxlength="100" data-detail-input="nome" aria-label="Nome do produto" style="display:none;flex:1;min-width:0;width:auto"></div>
      <div class="info-row" style="align-items:flex-start"><span>Descrição</span><strong data-detail-value="descricao"></strong><textarea class="input" name="descricao" maxlength="200" data-detail-input="descricao" aria-label="Descrição do produto" rows="3" style="display:none;flex:1;min-width:0;width:auto"></textarea></div>
      <div class="grupo-campo" data-product-image-edit style="display:none">
        <label class="upload-box upload-box--sm" for="detail-product-image">
          <span class="upload-box__icon">📷</span>
          <span class="upload-box__text">Foto do produto · clique para trocar</span>
          <span class="upload-box__hint">JPG ou PNG. Máx. 5 MB.</span>
          <input id="detail-product-image" class="visually-hidden" type="file" name="imagem" accept="image/jpeg,image/png" data-max-mb="5" aria-label="Selecionar nova foto do produto" disabled />
        </label>
      </div>`;
    form.querySelector('.stack')?.insertBefore(block, card);
  };
  ensureFields();
  const imageInput = form.querySelector('[name="imagem"]');
  const imageEdit = form.querySelector('[data-product-image-edit]');

  const clearImagePreview = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    imagePreviewUrl = null;
  };
  const renderProductImage = (imagePath, name) => {
    const imageContainer = document.querySelector('.detail-photo__img');
    if (!imageContainer) return;
    imageContainer.querySelectorAll('img').forEach(image => image.remove());
    if (!imagePath) return;
    const image = document.createElement('img');
    image.src = /^blob:/i.test(imagePath) ? imagePath : publicFileUrl(imagePath);
    image.alt = name;
    image.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:inherit';
    imageContainer.prepend(image);
  };

  const fill = async () => {
    const result = await api.get(`/produtos/${encodeURIComponent(id)}`);
    product = result.produto;
    const stockResult = await api.get(`/estoques/produto/${encodeURIComponent(id)}`).catch(() => ({ estoques: [] }));
    const stocks = stockResult.estoques || [];

    const title = document.querySelector('main h1');
    if (title) title.textContent = product.nome;
    document.title = `SweetLog — ${product.nome}`;
    const description = document.querySelector('.detail-photo__desc p');
    if (description) description.textContent = product.descricao || 'Nenhuma descrição cadastrada.';
    clearImagePreview();
    renderProductImage(product.imagem, product.nome);

    const values = {
      nome: product.nome,
      descricao: product.descricao || '',
      marca: product.marca || 'Não informada',
      cnpj_fabricante: product.cnpj_fabricante || '',
      tamanho: product.tamanho || 'Não informado',
      refrigeracao: product.necessidade_refrigeracao ? 'Sim' : 'Não'
    };
    Object.entries(values).forEach(([key, value]) => {
      const strong = form.querySelector(`[data-detail-value="${key}"]`);
      if (strong) strong.textContent = value;
      const input = form.querySelector(`[data-detail-input="${key}"]`);
      if (input) input.value = key === 'refrigeracao' ? String(Boolean(product.necessidade_refrigeracao)) : (key === 'marca' && value === 'Não informada' ? '' : key === 'tamanho' && value === 'Não informado' ? '' : value);
    });

    const quantity = document.querySelector('.stat-box--purple .stat-box__value');
    if (quantity) quantity.innerHTML = `${Number(product.quantidade_disponivel || 0).toLocaleString('pt-BR')} <small>unidades</small>`;
    const nearest = stocks.filter(stock => Number(stock.quantidade) > 0 && stock.status_validade !== 'vencido' && stock.data_validade)
      .sort((a, b) => String(a.data_validade).localeCompare(String(b.data_validade)))[0];
    const nextValidity = document.querySelectorAll('.stat-box__value')[1];
    const nextBadge = document.querySelector('.stat-box .badge');
    if (nextValidity) nextValidity.textContent = nearest ? formatDate(nearest.data_validade) : '—';
    if (nextBadge) nextBadge.textContent = nearest ? (Number(nearest.dias_para_validade) === 0 ? 'Vence hoje' : `Faltam ${nearest.dias_para_validade} dias`) : 'Sem lotes ativos';
    if (!canEdit) return;
    if (!document.querySelector('[data-delete-product]')) {
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'btn btn--outline';
      deleteButton.dataset.deleteProduct = '';
      deleteButton.textContent = 'Excluir produto';
      document.querySelector('.crumb-row')?.append(deleteButton);
      deleteButton.addEventListener('click', async () => {
        if (!confirm(`Excluir o produto "${product.nome}"? A API impedirá a exclusão caso haja lotes ou alertas associados.`)) return;
        try {
          await api.delete(`/produtos/${id}`);
          toast('Produto excluído.', 'success');
          location.href = 'produtos-lista.html';
        } catch (error) { toast(error.message, 'error'); }
      });
    }
  };

  try { await fill(); }
  catch (error) { toast(error.message || 'Não foi possível carregar o produto.', 'error'); return; }

  const setEditing = editing => {
    form.querySelectorAll('[data-detail-input]').forEach(input => {
      input.style.display = editing ? 'block' : 'none';
      input.disabled = !editing;
    });
    form.querySelectorAll('[data-detail-value]').forEach(value => { value.style.display = editing ? 'none' : ''; });
    if (actions) actions.style.display = editing ? 'flex' : 'none';
    if (imageEdit) imageEdit.style.display = editing ? 'block' : 'none';
    if (imageInput) imageInput.disabled = !editing;
    if (editButton) editButton.hidden = editing;
  };
  imageInput?.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast('Selecione uma imagem JPG ou PNG de até 5 MB.', 'warning');
      imageInput.value = '';
      clearImagePreview();
      renderProductImage(product.imagem, product.nome);
      return;
    }
    clearImagePreview();
    imagePreviewUrl = URL.createObjectURL(file);
    renderProductImage(imagePreviewUrl, product.nome);
  });
  editButton?.addEventListener('click', () => setEditing(true));
  document.querySelector('[data-cancel-detail]')?.addEventListener('click', () => {
    if (imageInput) imageInput.value = '';
    clearImagePreview();
    renderProductImage(product.imagem, product.nome);
    form.querySelectorAll('[data-detail-input]').forEach(input => {
      const key = input.dataset.detailInput;
      if (key === 'refrigeracao') input.value = String(Boolean(product.necessidade_refrigeracao));
      else input.value = product[key] ?? '';
    });
    setEditing(false);
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const values = new FormData(form);
    values.set('necessidade_refrigeracao', values.get('necessidade_refrigeracao') ?? values.get('refrigeracao') ?? '');
    values.delete('refrigeracao');
    values.delete('imagem');
    if (imageInput?.files?.[0]) values.append('imagem', imageInput.files[0]);
    try {
      const result = await api.put(`/produtos/${id}`, values);
      toast(result.mensagem || 'Produto atualizado.', 'success');
      if (imageInput) imageInput.value = '';
      clearImagePreview();
      await fill();
      setEditing(false);
    } catch (error) { toast(error.message || 'Não foi possível atualizar o produto.', 'error'); }
  });
}
