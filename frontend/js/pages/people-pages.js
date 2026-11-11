import { api } from '../core/api.js';
import { getSession } from '../core/session.js';
import { toast, escapeHtml, initials, setButtonLoading, hasPermission } from '../core/ui.js';

const SECTORS = ['Administrador', 'RH', 'Administrativo', 'Logística', 'Compras', 'Almoxarifado'];

function ensureEmployeeModal() {
  let dialog = document.querySelector('[data-employee-dialog]');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.dataset.employeeDialog = '';
  dialog.style.cssText = 'border:0;border-radius:16px;padding:24px;width:min(92vw,520px);box-shadow:0 20px 60px #0003';
  dialog.innerHTML = `
    <form method="dialog" data-employee-form>
      <h2 data-employee-dialog-title style="margin:0 0 16px">Cadastrar funcionário</h2>
      <div class="stack gap-16">
        <div class="grupo-campo" data-employee-registration-wrap><label for="employee-registration">Matrícula</label><select class="input" id="employee-registration" name="numero_matricula" required></select></div>
        <div class="grupo-campo"><label for="employee-name">Nome completo</label><input class="input" id="employee-name" name="nome" maxlength="100" required></div>
        <div class="grupo-campo"><label for="employee-phone">Telefone (DDD + número)</label><input class="input" id="employee-phone" name="telefone" type="tel" placeholder="11900000000" required></div>
        <div class="grupo-campo" data-employee-password-wrap><label for="employee-password">Senha inicial</label><input class="input" id="employee-password" name="senha" type="password" minlength="8" autocomplete="new-password"></div>
      </div>
      <div class="form-actions" style="justify-content:flex-end;margin-top:20px"><button class="btn btn--outline" type="button" data-dialog-close>Cancelar</button><button class="btn btn--primary" type="submit">Salvar</button></div>
    </form>`;
  document.body.append(dialog);
  dialog.querySelector('[data-dialog-close]').addEventListener('click', () => dialog.close());
  return dialog;
}

export async function initEmployeesPage() {
  const employeesBody = document.querySelector('[data-rows="funcionarios"]');
  const registrationsBody = document.querySelector('[data-rows="matriculas"]');
  if (!employeesBody || !registrationsBody) return;

  const session = getSession();
  const canManageRegistrations = hasPermission('manage-registrations', session?.funcionario?.setor);
  const matriculaTab = document.querySelector('[data-tab="matriculas"]');
  const matriculaPanel = document.querySelector('[data-panel="matriculas"]');
  if (!canManageRegistrations) {
    if (matriculaTab) matriculaTab.hidden = true;
    if (matriculaPanel) matriculaPanel.hidden = true;
  }

  const headerActions = document.querySelector('.head-actions');
  if (canManageRegistrations && headerActions && !headerActions.querySelector('[data-new-employee]')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--outline';
    button.dataset.newEmployee = '';
    button.textContent = '＋ Novo funcionário';
    headerActions.prepend(button);
  }

  let employees = [];
  let registrations = [];
  const employeeSearch = document.querySelector('[data-func-search="funcionarios"]');
  const registrationSearch = document.querySelector('[data-func-search="matriculas"]');

  const renderEmployees = () => {
    const term = (employeeSearch?.value || '').toLocaleLowerCase('pt-BR');
    const rows = employees.filter(item => `${item.numero_matricula} ${item.nome} ${item.setor} ${item.telefone || ''}`.toLocaleLowerCase('pt-BR').includes(term));
    employeesBody.innerHTML = rows.map(item => `<tr data-id="${item.numero_matricula}">
      <td class="cell-nowrap">${item.numero_matricula}</td>
      <td><div class="person"><span class="mini-avatar" aria-hidden="true">${initials(item.nome)}</span>${escapeHtml(item.nome)}</div></td>
      <td>${escapeHtml(item.setor || '—')}</td>
      <td class="cell-nowrap">${escapeHtml(item.telefone || '—')}</td>
      <td><div class="row-actions"><button type="button" class="icon-btn" aria-label="Editar funcionário" data-action="editar" data-tipo="funcionario">✏️</button><button type="button" class="icon-btn icon-btn--danger" aria-label="Excluir funcionário" data-action="excluir" data-tipo="funcionario">🗑️</button></div></td>
    </tr>`).join('');
    const empty = document.querySelector('#panel-funcionarios [data-empty]');
    if (empty) empty.hidden = rows.length > 0;
    const count = document.querySelector('[data-count="funcionarios"]');
    if (count) count.textContent = employees.length;
    const foot = document.querySelector('[data-foot="funcionarios"]');
    if (foot) foot.textContent = `Mostrando ${rows.length} de ${employees.length} funcionário(s)`;
  };

  const renderRegistrations = () => {
    const term = (registrationSearch?.value || '').toLocaleLowerCase('pt-BR');
    const rows = registrations.filter(item => `${item.numero_matricula} ${item.setor}`.toLocaleLowerCase('pt-BR').includes(term));
    registrationsBody.innerHTML = rows.map(item => `<tr data-id="${item.numero_matricula}"><td class="cell-nowrap">${item.numero_matricula}</td><td>${escapeHtml(item.setor)}</td><td><div class="row-actions"><button type="button" class="icon-btn" aria-label="Editar matrícula" data-action="editar" data-tipo="matricula">✏️</button><button type="button" class="icon-btn icon-btn--danger" aria-label="Excluir matrícula" data-action="excluir" data-tipo="matricula">🗑️</button></div></td></tr>`).join('');
    const empty = document.querySelector('#panel-matriculas [data-empty]');
    if (empty) empty.hidden = rows.length > 0;
    const count = document.querySelector('[data-count="matriculas"]');
    if (count) count.textContent = registrations.length;
    const foot = document.querySelector('[data-foot="matriculas"]');
    if (foot) foot.textContent = `Mostrando ${rows.length} de ${registrations.length} matrícula(s)`;
  };

  const loadEmployees = async () => {
    const result = await api.get('/funcionarios');
    employees = result.funcionarios || [];
    renderEmployees();
  };
  const loadRegistrations = async () => {
    if (!canManageRegistrations) return;
    const result = await api.get('/matriculas');
    registrations = result.matriculas || [];
    renderRegistrations();
  };

  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => {
      if (button.dataset.tab === 'matriculas' && !canManageRegistrations) return;
      document.querySelectorAll('[data-tab]').forEach(tab => {
        const active = tab === button;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      document.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== button.dataset.tab; });
    });
  });
  employeeSearch?.addEventListener('input', renderEmployees);
  registrationSearch?.addEventListener('input', renderRegistrations);

  const dialog = ensureEmployeeModal();
  const dialogForm = dialog.querySelector('[data-employee-form]');
  const openDialog = async employee => {
    const editing = Boolean(employee);
    dialog.querySelector('[data-employee-dialog-title]').textContent = editing ? 'Editar funcionário' : 'Cadastrar funcionário';
    const registrationWrap = dialog.querySelector('[data-employee-registration-wrap]');
    const passwordWrap = dialog.querySelector('[data-employee-password-wrap]');
    const registrationSelect = dialogForm.elements.namedItem('numero_matricula');
    const unassigned = registrations.filter(item => !item.nome_funcionario);
    if (!editing && !canManageRegistrations) {
      toast('A consulta de matrículas para novo cadastro exige perfil de Administrador ou RH.', 'error');
      return;
    }
    registrationWrap.hidden = editing;
    passwordWrap.hidden = editing;
    registrationSelect.innerHTML = unassigned.map(item => `<option value="${item.numero_matricula}">${item.numero_matricula} · ${escapeHtml(item.setor)}</option>`).join('');
    if (!editing && unassigned.length === 0) {
      toast('Não há matrículas sem funcionário vinculado. Cadastre uma matrícula primeiro.', 'error');
      return;
    }
    dialogForm.dataset.mode = editing ? 'edit' : 'create';
    dialogForm.dataset.id = employee?.numero_matricula || '';
    dialogForm.elements.namedItem('nome').value = employee?.nome || '';
    dialogForm.elements.namedItem('telefone').value = employee?.telefone || '';
    dialogForm.elements.namedItem('senha').value = '';
    dialogForm.elements.namedItem('senha').required = !editing;
    dialog.showModal();
  };

  document.querySelector('[data-new-employee]')?.addEventListener('click', () => openDialog(null));
  dialogForm.addEventListener('submit', async event => {
    event.preventDefault();
    const mode = dialogForm.dataset.mode;
    const payload = {
      nome: dialogForm.elements.namedItem('nome').value.trim(),
      telefone: dialogForm.elements.namedItem('telefone').value.replace(/\D/g, '')
    };
    if (mode === 'create') {
      payload.numero_matricula = Number(dialogForm.elements.namedItem('numero_matricula').value);
      payload.senha = dialogForm.elements.namedItem('senha').value;
    } else if (dialogForm.elements.namedItem('senha').value) {
      payload.senha = dialogForm.elements.namedItem('senha').value;
    }
    const button = dialogForm.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Salvando...');
    try {
      const result = mode === 'create'
        ? await api.post('/funcionarios', payload)
        : await api.put(`/funcionarios/${encodeURIComponent(dialogForm.dataset.id)}`, payload);
      toast(result.mensagem || 'Funcionário salvo.', 'success');
      dialog.close();
      await Promise.all([loadEmployees(), loadRegistrations()]);
    } catch (error) { toast(error.message || 'Não foi possível salvar o funcionário.', 'error'); }
    finally { setButtonLoading(button, false); }
  });

  const handleRowAction = async event => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const row = button.closest('tr[data-id]');
    const id = row?.dataset.id;
    const type = button.dataset.tipo;
    if (!id || !type) return;

    if (type === 'funcionario' && button.dataset.action === 'editar') {
      const employee = employees.find(item => String(item.numero_matricula) === String(id));
      if (employee) openDialog(employee);
      return;
    }
    if (type === 'matricula' && button.dataset.action === 'editar') {
      if (!canManageRegistrations) return;
      const registration = registrations.find(item => String(item.numero_matricula) === String(id));
      const options = SECTORS.map((sector, index) => `${index + 1}. ${sector}`).join('\n');
      const choice = prompt(`Novo setor para a matrícula ${id}:\n${options}`, String(SECTORS.indexOf(registration?.setor) + 1));
      if (choice === null) return;
      const sector = SECTORS[Number(choice) - 1];
      if (!sector) { toast('Opção de setor inválida.', 'error'); return; }
      try {
        await api.put(`/matriculas/${encodeURIComponent(id)}`, { setor: sector });
        toast('Matrícula atualizada.', 'success');
        await loadRegistrations();
      } catch (error) { toast(error.message || 'Não foi possível atualizar a matrícula.', 'error'); }
      return;
    }
    if (button.dataset.action === 'excluir') {
      const label = type === 'funcionario' ? 'funcionário' : 'matrícula';
      if (!confirm(`Excluir o(a) ${label} ${id}?`)) return;
      try {
        await api.delete(`/${type === 'funcionario' ? 'funcionarios' : 'matriculas'}/${encodeURIComponent(id)}`);
        toast(`${label.charAt(0).toUpperCase() + label.slice(1)} excluído(a).`, 'success');
        if (type === 'funcionario') await Promise.all([loadEmployees(), loadRegistrations()]);
        else await loadRegistrations();
      } catch (error) { toast(error.message || `Não foi possível excluir o(a) ${label}.`, 'error'); }
    }
  };
  employeesBody.addEventListener('click', handleRowAction);
  registrationsBody.addEventListener('click', handleRowAction);

  try { await loadEmployees(); await loadRegistrations(); }
  catch (error) { toast(error.message || 'Não foi possível carregar funcionários e matrículas.', 'error'); }
}

export function initNewRegistrationPage() {
  const form = document.querySelector('[data-matricula-form]');
  if (!form) return;
  const role = getSession()?.funcionario?.setor;
  if (!['Administrador', 'RH'].includes(role)) {
    toast('Somente Administrador e RH podem gerenciar matrículas.', 'error');
    location.replace('funcionariosMatricula.html');
    return;
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const registration = form.querySelector('#numero')?.value.trim();
    const sector = form.querySelector('#setor')?.value;
    if (!registration || !sector) { toast('Informe o número e o setor da matrícula.', 'error'); return; }
    const button = form.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Salvando...');
    try {
      const result = await api.post('/matriculas', { numero_matricula: Number(registration), setor: sector });
      toast(result.mensagem || 'Matrícula cadastrada.', 'success');
      location.href = 'funcionariosMatricula.html#matriculas';
    } catch (error) { toast(error.message || 'Não foi possível cadastrar a matrícula.', 'error'); }
    finally { setButtonLoading(button, false); }
  });
}
