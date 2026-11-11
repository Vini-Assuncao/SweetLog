# SweetLog — Frontend

Interface web do SweetLog, sistema de controle de estoque, lotes, vendas e saldo diário. O frontend é formado por páginas HTML estáticas que usam módulos JavaScript (ES Modules) e consomem a API REST do backend.

Este projeto não tem etapa de build para o JavaScript. Basta servir os arquivos por HTTP. A única etapa de build é a geração do CSS com Tailwind.

## Sumário

- [Stack](#stack)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Requisitos](#requisitos)
- [Como executar](#como-executar)
- [Configuração da API](#configuração-da-api)
- [Páginas](#páginas)
- [Sessão e autenticação](#sessão-e-autenticação)
- [Acesso por cargo](#acesso-por-cargo)
- [Recuperação de senha](#recuperação-de-senha)
- [Estilos e Tailwind](#estilos-e-tailwind)
- [Limitações conhecidas](#limitações-conhecidas)

## Stack

- HTML5 e JavaScript com ES Modules, sem framework
- Tailwind CSS 3 para estilização (CSS pré-gerado em `css/build.css`)
- Ícone e estilos legados em `css/legado/`, mantidos para referência

## Estrutura do projeto

```
├── login.html, cadastro.html     Autenticação e cadastro de funcionário
├── recuperar-senha.html          Recuperação de senha, etapa 1
├── verificar-codigo.html         Recuperação de senha, etapa 2
├── nova-senha.html               Recuperação de senha, etapa 3
├── dashboard.html                Painel principal
├── produtos-lista.html, produto-cadastrar.html, produto-detalhe.html
├── estoque.html, estoque-entrada.html, estoque-saida.html, lotes.html
├── vendas.html, venda-detalhe.html, saldo-diario.html
├── funcionariosMatricula.html, novaMatricula.html   Administração de matrículas
├── css/
│   ├── build.css                 CSS gerado pelo Tailwind (usado pelas páginas)
│   ├── styles.css                Estilos complementares
│   └── legado/                   Folhas de estilo antigas, mantidas para referência
├── js/
│   ├── app.js                    Ponto de entrada: escolhe o inicializador da página
│   ├── tailwind.config.js        Configuração do Tailwind (cores e fontes da marca)
│   ├── core/
│   │   ├── config.js             Endereço da API
│   │   ├── api.js                Cliente HTTP com token e tratamento de erros
│   │   ├── session.js            Armazenamento da sessão e da recuperação de senha
│   │   └── ui.js                 Navegação, formatação, permissões e notificações
│   └── pages/                    Um módulo por área do sistema
└── icon.png
```

Cada página HTML carrega apenas `js/app.js` como módulo. O `app.js` identifica a página pelo nome do arquivo e chama o inicializador correspondente em `js/pages/`.

## Requisitos

- Um servidor HTTP para servir os arquivos. Abrir os HTML direto pelo navegador (`file://`) não funciona, porque os módulos ES exigem HTTP.
- A API do SweetLog em execução. Veja o README do backend.
- Node.js e npm apenas se for necessário regenerar o CSS com Tailwind.

## Como executar

1. Suba a API do backend, por padrão em `http://localhost:3000`.

2. Sirva a pasta do frontend. Algumas opções:

   ```bash
   # Python
   python3 -m http.server 5500

   # Node (sem instalação)
   npx serve -l 5500
   ```

3. Abra `http://localhost:5500/login.html` no navegador.

Se a API estiver no CORS restrito (`CORS_ORIGIN` no backend), inclua a origem do frontend nessa variável, por exemplo `http://localhost:5500`.

## Configuração da API

O endereço da API fica em `js/core/config.js`:

```js
export const API_BASE_URL = (window.SWEETLOG_API_URL || 'http://localhost:3000').replace(/\/$/, '');
```

Para apontar para outra API sem alterar o código, defina `window.SWEETLOG_API_URL` antes de carregar `app.js`, por exemplo em um script inline no HTML:

```html
<script>
  window.SWEETLOG_API_URL = 'https://api.seudominio.com.br';
</script>
<script type="module" src="js/app.js"></script>
```

Em produção, defina o valor em todas as páginas que carregam o `app.js`, ou centralize esse script em um arquivo único incluído por elas.

## Páginas

| Página | Acesso | Função |
|---|---|---|
| `login.html` | Público | Login com matrícula e senha |
| `cadastro.html` | Público | Ativação de uma matrícula já criada, com nome, e-mail e senha |
| `recuperar-senha.html` | Público | Informa o e-mail para receber o código |
| `verificar-codigo.html` | Público | Digita o código de 6 dígitos |
| `nova-senha.html` | Público | Define a nova senha |
| `dashboard.html` | Restrito | Painel com indicadores |
| `produtos-lista.html`, `produto-detalhe.html` | Todos os cargos | Consulta de produtos |
| `produto-cadastrar.html` | Administrador, Almoxarifado, Compras | Cadastro de produto |
| `estoque.html`, `lotes.html` | Administrador, Almoxarifado, Logística, Compras | Estoque e lotes |
| `estoque-entrada.html` | Administrador, Almoxarifado, Logística, Compras | Entrada de estoque com nota fiscal |
| `estoque-saida.html` | Administrador, Almoxarifado, Logística | Saída de estoque |
| `vendas.html`, `venda-detalhe.html` | Administrador, Administrativo, Almoxarifado, Logística | Vendas |
| `saldo-diario.html` | Administrador, Administrativo | Saldo diário |
| `funcionariosMatricula.html`, `novaMatricula.html` | Administrador, RH | Matrículas e funcionários |

Os módulos JavaScript de cada página estão em `js/pages/`:

- `auth-pages.js`: login, cadastro e recuperação de senha
- `dashboard-page.js`: painel
- `product-pages.js`: produtos
- `inventory-pages.js`: estoque, entrada, saída e lotes
- `sales-pages.js`: vendas e saldo diário
- `people-pages.js`: funcionários e matrículas

## Sessão e autenticação

Ao fazer login, o frontend guarda o token retornado pela API e os dados do funcionário. A sessão fica em `sessionStorage` por padrão. Se o usuário marcar a opção de manter conectado, ela fica em `localStorage`.

`api.js` envia o token no cabeçalho `Authorization: Bearer <token>` em todas as requisições protegidas. Quando a API responde 401, a sessão é limpa e o usuário volta para o login.

A recuperação de senha guarda o e-mail e o token de redefinição em `sessionStorage`, apenas durante o fluxo, e os remove ao concluir.

## Acesso por cargo

O arquivo `js/core/ui.js` define duas tabelas:

- `ROLE_ACCESS`: quais cargos podem abrir cada página. Quem não tem acesso é redirecionado para uma página permitida.
- `ROLE_PERMISSIONS`: permissões para elementos da interface. Elementos com o atributo `data-permission` são ocultados quando o cargo não tem a permissão.

Essas regras controlam apenas a interface. A API reforça as mesmas permissões em cada rota. Ao alterar um cargo, atualize as duas tabelas no frontend e as regras de autorização no backend.

## Recuperação de senha

O fluxo tem três telas e usa o e-mail cadastrado do funcionário:

1. `recuperar-senha.html` envia o e-mail para `POST /funcionarios/recuperar-senha`. A mensagem exibida é sempre a mesma, exista ou não a conta.
2. `verificar-codigo.html` envia o código de 6 dígitos para `POST /funcionarios/verificar-codigo`. Os campos aceitam colar o código inteiro e avançam automaticamente entre os dígitos. A tela também permite reenviar o código.
3. `nova-senha.html` envia a nova senha para `POST /funcionarios/redefinir-senha`, junto com o token recebido na etapa anterior.

Ao concluir, o usuário volta ao login.

## Estilos e Tailwind

As páginas usam `css/build.css`, que já vem gerado. Ele é produzido a partir da configuração em `js/tailwind.config.js`, que varre `./*.html` e `./js/**/*.js` em busca de classes.

Para regenerar o CSS, instale as dependências e rode o script de build:

```bash
npm install
npm run build:css
```

Atenção: os scripts em `package.json` apontam para `./src/styles.css`, arquivo que não está neste projeto, e a configuração do Tailwind está em `js/tailwind.config.js`, não na raiz. Antes de regenerar o CSS, ajuste os caminhos do script ou crie o arquivo de entrada. Sem isso, o build falha.

O `package.json` também declara `multer` como dependência, que não é usada pelo frontend. Ela pode ser removida.

## Limitações conhecidas

- O frontend não tem testes automatizados.
- O JavaScript não é minificado nem empacotado. Isso simplifica o desenvolvimento, mas o carregamento inicial faz várias requisições de módulos.
- Alguns módulos não são usados por nenhuma página e podem ser removidos: `js/core/auth.js`, `js/pages/auth.js`, `js/pages/people.js`, `js/pages/products.js`, `js/pages/sales.js`, `js/pages/stock.js` e `js/pages/reports.js`. Confirme antes de excluir.
- A pasta `css/legado/` contém estilos antigos que não são carregados pelas páginas atuais.
- O controle de acesso por cargo no frontend é apenas visual. A segurança depende das regras aplicadas pela API.