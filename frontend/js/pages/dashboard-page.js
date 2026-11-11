import { api } from '../core/api.js';
import { getSession } from '../core/session.js';
import { toast, escapeHtml, formatCurrency, formatDate, applyRoleVisibility } from '../core/ui.js';

export async function initDashboardPage() {
  const main = document.querySelector('main.page');
  if (!main) return;
  const session = getSession();
  const heading = main.querySelector('.page-head h1');
  if (heading && session?.funcionario?.nome) {
    heading.textContent = `Olá, ${session.funcionario.nome.split(' ')[0]}!`;
  }

  try {
    const result = await api.get('/dashboard');
    const summary = result.resumo || {};
    const kpis = document.createElement('section');
    kpis.className = 'kpi-grid';
    kpis.innerHTML = `
      <div class="card kpi-card"><div class="kpi-card__icon">🥐</div><p class="kpi-card__label">Produtos cadastrados</p><p class="kpi-card__value">${Number(summary.total_produtos || 0)}</p></div>
      <div class="card kpi-card"><div class="kpi-card__icon">📦</div><p class="kpi-card__label">Lotes ativos</p><p class="kpi-card__value">${Number(summary.lotes_ativos || 0)}</p></div>
      <div class="card kpi-card"><div class="kpi-card__icon kpi-card__icon--warning">⚠️️</div><p class="kpi-card__label">Vencendo em até 7 dias</p><p class="kpi-card__value">${Number(summary.lotes_vencendo_em_7_dias || 0)}</p></div>
      <div class="card kpi-card"><div class="kpi-card__icon">💰</div><p class="kpi-card__label">Faturamento de hoje</p><p class="kpi-card__value">${formatCurrency(summary.faturamento_hoje)}</p><p class="kpi-card__note">${Number(summary.vendas_hoje || 0)} venda(s)</p></div>`;
    const quickGrid = main.querySelector('.quick-grid');
    quickGrid?.after(kpis);

    const alertCard = main.querySelector('.alert-card');
    if (alertCard) {
      const alerts = result.alertas_recentes || [];
      alertCard.innerHTML = `
        <div class="alert-card__head"><div class="row gap-8"><span class="alert-card__warn">⚠️️</span><strong>Alertas ativos</strong></div><span class="badge badge--danger">${alerts.length}</span></div>
        ${alerts.length ? alerts.map(alert => `
          <div class="alert-row"><div class="row gap-12"><span class="alert-row__icon">${alert.tipo === 'Validade próxima' ? '📅' : alert.tipo === 'Estoque vencido' ? '⛔' : '📦'}</span><div><p class="alert-row__title">${escapeHtml(alert.nome_produto || 'Produto')}</p><p class="alert-row__sub">${escapeHtml(alert.tipo)}${alert.data_validade ? ` · validade ${formatDate(alert.data_validade)}` : ''}</p></div></div><a href="lotes.html" class="alert-row__action">Revisar</a></div>
        `).join('') : '<p class="empty-state">Nenhum alerta ativo.</p>'}`;
    }

    const lowStock = result.estoques_baixos || [];
    if (lowStock.length) {
      const section = document.createElement('section');
      section.innerHTML = `<h2 class="section-title">Estoque baixo</h2><div class="card alert-card">${lowStock.map(item => `<div class="alert-row"><div><p class="alert-row__title">${escapeHtml(item.nome)}</p><p class="alert-row__sub">${Number(item.quantidade_disponivel || 0)} unidade(s) disponíveis</p></div><a class="alert-row__action" href="produtos-lista.html">Ver produto</a></div>`).join('')}</div>`;
      alertCard?.after(section);
    }
  } catch (error) {
    toast(error.message || 'Não foi possível carregar o dashboard.', 'error');
  }
  applyRoleVisibility(session?.funcionario?.setor);
}
