(function (window, document) {
  'use strict';

  var app = window.SweetLog = window.SweetLog || {};
  var api = app.api;
  var ui = app.ui;

  function createEmployeeDialog() {
    var dialog = document.createElement('div');
    dialog.id = 'employee-dialog';
    dialog.hidden = true;
    dialog.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';
    dialog.innerHTML = '<form class="card form-card" style="width:min(100%,520px);max-height:90vh;overflow:auto;background:#fff" data-new-employee-form>' +
      '<div class="row" style="justify-content:space-between;align-items:center"><h2>Novo funcionário</h2><button type="button" class="btn btn--outline" data-close-employee>Fechar</button></div>' +
      '<div class="stack gap-16" style="margin-top:18px">' +
      '<label class="field">Matrícula disponível<select class="input" name="numero_matricula" required><option value="">Selecione</option></select></label>' +
      '<label class="field">Nome completo<input class="input" name="nome" maxlength="100" required></label>' +
      '<label class="field">Telefone<input class="input" name="telefone" type="tel" placeholder="11900000000"></label>' +
      '<label class="field">Senha inicial<input class="input" name="senha" type="password" minlength="8" maxlength="72" required></label>' +
      '<div class="form-actions"><button type="button" class="btn btn--outline" data-cancel-employee>Cancelar</button><button type="submit" class="btn btn--primary">Cadastrar funcionário</button></div>' +
      '</div></form>';
    document.body.appendChild(dialog);
    return dialog;
  }

  async function initPeoplePage() {
    var funcRows = document.querySelector('[data-rows="funcionarios"]');
    var matriculaRows = document.querySelector('[data-rows="matriculas"]');
    if (!funcRows || !matriculaRows) return;
    var funcSearch = document.querySelector('[data-func-search="funcionarios"]');
    var matriculaSearch = document.querySelector('[data-func-search="matriculas"]');
    var funcionarios = [];
    var matriculas = [];
    var dialog = createEmployeeDialog();
    var employeeForm = dialog.querySelector('[data-new-employee-form]');
    var registrationSelect = employeeForm.querySelector('[name="numero_matricula"]');

    function renderEmployees() {
      var term = funcSearch ? funcSearch.value.trim().toLocaleLowerCase('pt-BR') : '';
      var filtered = funcionarios.filter(function (person) {
        return [person.numero_matricula, person.nome, person.setor, person.telefone].join(' ').toLocaleLowerCase('pt-BR').includes(term);
      });
      funcRows.innerHTML = filtered.length ? filtered.map(function (person) {
        return '<tr data-id="' + Number(person.numero_matricula) + '"><td class="cell-nowrap">' + ui.escape(person.numero_matricula) + '</td>' +
          '<td><div class="person"><span class="mini-avatar">' + ui.escape(ui.initials(person.nome)) + '</span>' + ui.escape(person.nome) + '</div></td>' +
          '<td>' + ui.escape(person.setor || '—') + '</td><td class="cell-nowrap">' + ui.escape(person.telefone || '—') + '</td>' +
          '<td><div class="row-actions"><button type="button" class="icon-btn" aria-label="Editar funcionário" data-action="editar">✏️</button><button type="button" class="icon-btn icon-btn--danger" aria-label="Excluir funcionário" data-action="excluir">🗑️</button></div></td></tr>';
      }).join('') : ui.emptyRow(5, 'Nenhum funcionário encontrado.');
      var count = document.querySelector('[data-count="funcionarios"]');
      if (count) count.textContent = funcionarios.length;
      var foot = document.querySelector('[data-foot="funcionarios"]');
      if (foot) foot.textContent = 'Mostrando ' + filtered.length + ' de ' + funcionarios.length + ' funcionário(s)';
      var empty = document.querySelector('#panel-funcionarios [data-empty]');
      if (empty) empty.hidden = filtered.length > 0;
    }

    function renderRegistrations() {
      var term = matriculaSearch ? matriculaSearch.value.trim().toLocaleLowerCase('pt-BR') : '';
      var filtered = matriculas.filter(function (item) {
        return [item.numero_matricula, item.setor, item.nome_funcionario].join(' ').toLocaleLowerCase('pt-BR').includes(term);
      });
      matriculaRows.innerHTML = filtered.length ? filtered.map(function (item) {
        var status = item.nome_funcionario ? ' • ' + item.nome_funcionario : ' • Disponível';
        return '<tr data-id="' + Number(item.numero_matricula) + '"><td class="cell-nowrap">' + ui.escape(item.numero_matricula) + '</td>' +
          '<td>' + ui.escape(item.setor) + '<small class="muted">' + ui.escape(status) + '</small></td>' +
          '<td><div class="row-actions"><button type="button" class="icon-btn" aria-label="Editar matrícula" data-action="editar">✏️</button><button type="button" class="icon-btn icon-btn--danger" aria-label="Excluir matrícula" data-action="excluir">🗑️</button></div></td></tr>';
      }).join('') : ui.emptyRow(3, 'Nenhuma matrícula encontrada.');
      var count = document.querySelector('[data-count="matriculas"]');
      if (count) count.textContent = matriculas.length;
      var foot = document.querySelector('[data-foot="matriculas"]');
      if (foot) foot.textContent = 'Mostrando ' + filtered.length + ' de ' + matriculas.length + ' matrícula(s)';
      var empty = document.querySelector('#panel-matriculas [data-empty]');
      if (empty) empty.hidden = filtered.length > 0;
      registrationSelect.innerHTML = '<option value="">Selecione</option>' + matriculas.filter(function (item) {
        return !item.nome_funcionario;
      }).map(function (item) {
        return '<option value="' + Number(item.numero_matricula) + '">' + Number(item.numero_matricula) + ' — ' + ui.escape(item.setor) + '</option>';
      }).join('');
    }

    async function load() {
      try {
        var result = await Promise.all([api.get('/funcionarios'), api.get('/matriculas')]);
        funcionarios = result[0].funcionarios || [];
        matriculas = result[1].matriculas || [];
        renderEmployees();
        renderRegistrations();
      } catch (error) {
        ui.toast(error.message, 'error');
      }
    }

    function closeDialog() { dialog.hidden = true; employeeForm.reset(); }
    var addEmployeeButton = document.querySelector('[data-add-employee]');
    if (addEmployeeButton) addEmployeeButton.addEventListener('click', function () {
      renderRegistrations();
      dialog.style.display = 'flex';
      dialog.hidden = false;
    });
    dialog.querySelectorAll('[data-close-employee], [data-cancel-employee]').forEach(function (button) {
      button.addEventListener('click', closeDialog);
    });
    dialog.addEventListener('click', function (event) { if (event.target === dialog) closeDialog(); });
    employeeForm.addEventListener('submit', async function (event) {
      event.preventDefault();
      var values = new FormData(employeeForm);
      var body = {
        numero_matricula: Number(values.get('numero_matricula')),
        nome: String(values.get('nome') || '').trim(),
        telefone: String(values.get('telefone') || '').replace(/\D/g, ''),
        senha: String(values.get('senha') || '')
      };
      if (!body.numero_matricula || !body.nome || body.senha.length < 8) {
        ui.toast('Selecione uma matrícula, informe o nome e uma senha com pelo menos 8 caracteres.', 'error');
        return;
      }
      var button = employeeForm.querySelector('[type="submit"]');
      ui.setBusy(button, true, 'Cadastrando...');
      try {
        var response = await api.post('/funcionarios', body);
        ui.toast(response.mensagem || 'Funcionário cadastrado.', 'success');
        closeDialog();
        await load();
      } catch (error) {
        ui.toast(error.message, 'error');
      } finally {
        ui.setBusy(button, false);
      }
    });

    [funcSearch, matriculaSearch].forEach(function (input) {
      if (!input) return;
      input.addEventListener('input', function () {
        if (input === funcSearch) renderEmployees();
        else renderRegistrations();
      });
    });

    document.querySelectorAll('[data-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var key = tab.dataset.tab;
        document.querySelectorAll('[data-tab]').forEach(function (item) {
          var selected = item === tab;
          item.classList.toggle('is-active', selected);
          item.setAttribute('aria-selected', selected ? 'true' : 'false');
        });
        document.querySelectorAll('[data-panel]').forEach(function (panel) { panel.hidden = panel.dataset.panel !== key; });
      });
    });

    funcRows.addEventListener('click', async function (event) {
      var button = event.target.closest('[data-action]');
      if (!button) return;
      var row = button.closest('tr[data-id]');
      var id = row && row.dataset.id;
      var person = funcionarios.find(function (item) { return String(item.numero_matricula) === String(id); });
      if (!person) return;
      if (button.dataset.action === 'editar') {
        var name = window.prompt('Nome do funcionário:', person.nome);
        if (name === null) return;
        var phone = window.prompt('Telefone com DDD:', person.telefone || '');
        if (phone === null) return;
        try {
          var result = await api.put('/funcionarios/' + encodeURIComponent(id), {
            nome: name.trim(), telefone: phone.replace(/\D/g, '')
          });
          ui.toast(result.mensagem || 'Funcionário atualizado.', 'success');
          await load();
        } catch (error) { ui.toast(error.message, 'error'); }
      } else if (button.dataset.action === 'excluir') {
        if (!window.confirm('Excluir o funcionário ' + person.nome + '?')) return;
        try {
          var result = await api.delete('/funcionarios/' + encodeURIComponent(id));
          ui.toast(result.mensagem || 'Funcionário excluído.', 'success');
          await load();
        } catch (error) { ui.toast(error.message, 'error'); }
      }
    });

    matriculaRows.addEventListener('click', async function (event) {
      var button = event.target.closest('[data-action]');
      if (!button) return;
      var row = button.closest('tr[data-id]');
      var id = row && row.dataset.id;
      var item = matriculas.find(function (record) { return String(record.numero_matricula) === String(id); });
      if (!item) return;
      if (button.dataset.action === 'editar') {
        var sector = window.prompt('Novo setor (Administrador, RH, Administrativo, Logística, Compras ou Almoxarifado):', item.setor);
        if (sector === null) return;
        try {
          var result = await api.put('/matriculas/' + encodeURIComponent(id), { setor: sector.trim() });
          ui.toast(result.mensagem || 'Matrícula atualizada.', 'success');
          await load();
        } catch (error) { ui.toast(error.message, 'error'); }
      } else if (button.dataset.action === 'excluir') {
        if (!window.confirm('Excluir a matrícula ' + id + '?')) return;
        try {
          var result = await api.delete('/matriculas/' + encodeURIComponent(id));
          ui.toast(result.mensagem || 'Matrícula excluída.', 'success');
          await load();
        } catch (error) { ui.toast(error.message, 'error'); }
      }
    });

    await load();
  }

  function initNewRegistration() {
    var form = document.querySelector('[data-matricula-form]');
    if (!form) return;
    var cancel = form.querySelector('[data-cancel-btn]');
    if (cancel) cancel.addEventListener('click', function () { window.location.href = cancel.dataset.cancelHref || 'funcionariosMatricula.html'; });
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      var number = form.querySelector('[name="numero_matricula"]');
      var sector = form.querySelector('[name="setor"]');
      if (!/^\d+$/.test(number.value) || Number(number.value) <= 0 || !sector.value) {
        ui.toast('Informe uma matrícula positiva e selecione o setor.', 'error');
        return;
      }
      var button = form.querySelector('[type="submit"]');
      ui.setBusy(button, true, 'Salvando...');
      try {
        var result = await api.post('/matriculas', {
          numero_matricula: Number(number.value),
          setor: sector.value
        });
        ui.toast(result.mensagem || 'Matrícula cadastrada.', 'success');
        window.setTimeout(function () { window.location.href = 'funcionariosMatricula.html#matriculas'; }, 800);
      } catch (error) {
        ui.toast(error.message, 'error');
        ui.setBusy(button, false);
      }
    });
  }

  app.pages = app.pages || {};
  app.pages.initPeople = function () {
    initPeoplePage();
    initNewRegistration();
  };
})(window, document);
