import { getPageName, requirePageAccess, initGlobalNavigation, initCommonControls } from './core/ui.js';
import { initLoginPage, initSignupPage, initRecoveryPage, initVerifyCodePage, initResetPasswordPage } from './pages/auth-pages.js';
import { initProductListPage, initProductCreatePage, initProductDetailPage } from './pages/product-pages.js';
import { initDashboardPage } from './pages/dashboard-page.js';
import { initStockHomePage, initStockEntryPage, initStockExitPage, initLotsPage } from './pages/inventory-pages.js';
import { initSalesListPage, initSaleDetailPage, initDailyBalancePage } from './pages/sales-pages.js';
import { initEmployeesPage, initNewRegistrationPage } from './pages/people-pages.js';

async function boot() {
  const page = getPageName();

  if (page === 'index.html') return;
  if (page === 'login.html') return initLoginPage();
  if (page === 'cadastro.html') return initSignupPage();
  if (page === 'recuperar-senha.html') return initRecoveryPage();
  if (page === 'verificar-codigo.html') return initVerifyCodePage();
  if (page === 'nova-senha.html') return initResetPasswordPage();

  const session = requirePageAccess();
  if (!session) return;
  initGlobalNavigation(session);
  initCommonControls();

  const pageInitializers = {
    'dashboard.html': initDashboardPage,
    'produtos-lista.html': initProductListPage,
    'produto-cadastrar.html': initProductCreatePage,
    'produto-detalhe.html': initProductDetailPage,
    'estoque.html': initStockHomePage,
    'estoque-entrada.html': initStockEntryPage,
    'estoque-saida.html': initStockExitPage,
    'lotes.html': initLotsPage,
    'vendas.html': initSalesListPage,
    'venda-detalhe.html': initSaleDetailPage,
    'saldo-diario.html': initDailyBalancePage,
    'funcionariosMatricula.html': initEmployeesPage,
    'novaMatricula.html': initNewRegistrationPage
  };

  const initialize = pageInitializers[page];
  if (initialize) await initialize();
}

document.addEventListener('DOMContentLoaded', () => {
  boot().catch(error => {
    console.error('Erro ao iniciar a interface SweetLog:', error);
  });
});
