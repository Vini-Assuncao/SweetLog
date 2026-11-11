(function (window, document) {
  'use strict';

  var app = window.SweetLog = window.SweetLog || {};
  var api = app.api;
  var ui = app.ui;

  function alertLabel(alert) {
    var type = alert.tipo || 'Alerta';
    var detail = alert.nome_produto || 'Produto sem identificação';
    if (alert.lote_producao) detail += ' — lote ' + alert.lote_producao;
    if (alert.data_validade) detail += ' — validade ' + ui.formatDate(alert.data_validade);
    return { type: type, detail: detail };
  }

  async function initDashboard() {
    var main = document.querySelector('main.page');
    if (!main || !/dashboard\.html$/i.test(window.location.pathname)) return;
    try {
      var result = await api.get('/dashboard');
      var summary = result.resumo || {};
      var quickGrid = main.querySelector('.quick-grid');
      var alertsCard = main.querySelector('.alert-card');

      var cards = [
        ['Produtos cadastrados', summary.total_produtos || 0, '🥐'],
        ['Lotes ativos', summary.lotes_ativos || 0, '📦'],
        ['Unidades disponíveis', summary.quantidade_disponivel || 0, '🧺'],
        ['Vendas hoje', summary.vendas_hoje || 0, '🧾'],
        ['Faturamento de hoje', ui.formatMoney(summary.faturamento_hoje || 0), '💰'],
        ['Lotes vencidos', summary.lotes_vencidos || 0, '⚠️']
      ];
      var grid = document.createElement('div');
      grid.className = 'kpi-grid';
      grid.innerHTML = cards.map(function (item) {
        return '<div class="card kpi-card"><div class="kpi-card__icon">' + item[2] + '</div><p class="kpi-card__label">' + ui.escape(item[0]) + '</p><p class="kpi-card__value">' + ui.escape(item[1]) + '</p></div>';
      }).join('');
      if (quickGrid) quickGrid.insertAdjacentElement('afterend', grid);

      if (alertsCard) {
        var alerts = result.alertas_recentes || [];
        alertsCard.innerHTML = '<div class="alert-card__head"><div class="row gap-8"><span class="alert-card__warn">⚠️</span><strong>Alertas ativos</strong></div><span class="badge badge--danger">' + alerts.length + ' alerta(s)</span></div>' +
          (alerts.length ? alerts.map(function (alert) {
            var label = alertLabel(alert);
            return '<div class="alert-row"><div class="row gap-12"><span class="alert-row__icon">' + (alert.tipo === 'Validade próxima' ? '⏳' : alert.tipo === 'Estoque vencido' ? '⛔' : '📉') + '</span><div><p class="alert-row__title">' + ui.escape(label.detail) + '</p><p class="alert-row__sub">' + ui.escape(label.type) + ' • ' + ui.escape(ui.formatDate(alert.data_alerta)) + '</p></div></div><a href="lotes.html" class="alert-row__action">Revisar</a></div>';
          }).join('') : '<p class="muted" style="padding:16px 0">Nenhum alerta ativo no momento.</p>');
      }
    } catch (error) {
      ui.toast(error.message, 'error');
    }
  }

  async function initDailyBalance() {
    var main = document.querySelector('main.page');
    var exportButton = document.querySelector('[data-export-btn]');
    if (!main || !exportButton) return;
    var header = main.querySelector('.list-head');
    var headingText = main.querySelector('.list-head .page-head p');
    var dateInput = document.querySelector('[data-balance-date]');
    var panels = main.querySelectorAll('.saldo-panel');
    var majorPanel = panels[0];
    var valuePanel = panels[1];
    var chartPanel = panels[2];
    var currentDate = ui.todayISO();
    if (dateInput) {
      dateInput.value = currentDate;
      dateInput.max = currentDate;
      dateInput.addEventListener('change', function () {
        currentDate = dateInput.value || ui.todayISO();
        load();
      });
    }

    async function load() {
      try {
        var responses = await Promise.all([
          api.get('/saldo-diario/resumo?data=' + encodeURIComponent(currentDate)),
          api.get('/saldo-diario/historico?dias=10')
        ]);
        var saldo = responses[0].saldo || {};
        var history = responses[1].historico || [];
        if (headingText) headingText.textContent = 'Resumo de ' + ui.formatDate(saldo.data || currentDate);

        if (majorPanel) {
          var topItems = saldo.maiores_vendas || [];
          majorPanel.innerHTML = '<h3 class="saldo-panel__title">⭐ Maiores vendas por produto</h3>' +
            (topItems.length ? topItems.map(function (item) {
              return '<div class="sale-row"><span class="sale-row__icon">🥐</span><div class="sale-row__info"><p class="sale-row__title">' + ui.escape(item.nome_produto) + '</p><small>' + ui.escape(item.quantidade_vendida) + ' unidade(s)</small></div><strong>' + ui.escape(ui.formatMoney(item.valor_total)) + '</strong></div>';
            }).join('') : '<p class="muted">Nenhuma venda registrada nessa data.</p>');
        }

        if (valuePanel) {
          var variation = saldo.variacao_percentual;
          var variationText = variation === null || variation === undefined ? 'Sem comparação' : (Number(variation) >= 0 ? '+' : '') + variation + '% vs. dia anterior';
          var variationClass = Number(variation) >= 0 ? 'badge--success' : 'badge--danger';
          valuePanel.innerHTML = '<h3 class="saldo-panel__title">💳 Faturamento bruto do dia</h3><div class="row" style="justify-content:space-between;align-items:flex-end"><p class="saldo-value">' + ui.escape(ui.formatMoney(saldo.faturamento_bruto)) + '</p><span class="badge ' + variationClass + '">' + ui.escape(variationText) + '</span></div>' +
            '<p class="muted">' + ui.escape(saldo.total_vendas || 0) + ' venda(s) • ' + ui.escape(saldo.itens_vendidos || 0) + ' unidade(s) vendida(s)</p>';
        }

        if (chartPanel) {
          var max = Math.max.apply(null, history.map(function (item) { return Number(item.faturamento_bruto || 0); }).concat([1]));
          chartPanel.innerHTML = '<h3 class="saldo-panel__title">📈 Faturamento — últimos 10 dias</h3><div class="chart-bars">' +
            history.map(function (item) {
              var height = Math.max(3, Number(item.faturamento_bruto || 0) / max * 100);
              return '<span title="' + ui.escape(ui.formatDate(item.data) + ': ' + ui.formatMoney(item.faturamento_bruto)) + '" style="height:' + height + '%"></span>';
            }).join('') + '</div><div class="chart-axis">' + history.map(function (item) { return '<span>' + ui.escape(ui.dateOnly(item.data).slice(8, 10)) + '</span>'; }).join('') + '</div>';
        }
      } catch (error) {
        ui.toast(error.message, 'error');
      }
    }

    exportButton.addEventListener('click', async function () {
      ui.setBusy(exportButton, true, 'Exportando...');
      try {
        await api.download('/saldo-diario/exportar?data=' + encodeURIComponent(currentDate), 'saldo-diario-' + currentDate + '.csv');
        ui.toast('Relatório exportado.', 'success');
      } catch (error) {
        ui.toast(error.message, 'error');
      } finally {
        ui.setBusy(exportButton, false);
      }
    });

    await load();
  }

  app.pages = app.pages || {};
  app.pages.initReports = function () {
    initDashboard();
    initDailyBalance();
  };
})(window, document);
