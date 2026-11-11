# SweetLog

Sistema de controle de estoque, lotes, vendas e saldo diário. O projeto é dividido em duas partes independentes que se comunicam por HTTP:

- **`backend/`**: API REST em Node.js, Express 5 e MySQL.
- **`frontend/`**: interface web em HTML e JavaScript (ES Modules), sem etapa de build para o JavaScript.

Cada parte tem seu próprio README com os detalhes técnicos:

- [Documentação do backend](backend/README.md)
- [Documentação do frontend](frontend/README.md)

## Como os componentes se conectam

```
Navegador  ──►  Frontend (HTML/JS)  ──►  API (Express)  ──►  MySQL
                  servido por HTTP         porta 3000          banco sweetlog
                                                  └──►  Resend (e-mails de recuperação de senha)
```

O frontend não acessa o banco. Toda leitura e escrita passa pela API, que valida o token de cada requisição e aplica as permissões por cargo.

## Pré-requisitos

- Node.js 18 ou superior e npm
- MySQL 8.0 ou compatível
- Um navegador moderno

## Passo a passo

### 1. Banco de dados

Crie o banco executando o schema:

```bash
mysql -u root -p < backend/database.sql
```

O arquivo cria o banco `sweetlog`, as tabelas, a view e o evento de alertas. Ele não insere dados de exemplo, então crie a primeira matrícula diretamente no banco.

### 2. API (backend)

```bash
cd backend
npm install
```

Crie o arquivo `backend/.env` com pelo menos:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=sweetlog
JWT_SECRET=uma-chave-com-pelo-menos-32-caracteres
CORS_ORIGIN=http://localhost:5500
```

Para a recuperação de senha por e-mail, adicione `RESEND_API_KEY` e `RESEND_FROM`. Sem elas, o restante da API funciona normalmente.

Inicie a API:

```bash
npm start
```

Ela responde em `http://localhost:3000`. Para confirmar, acesse `http://localhost:3000/`.

### 3. Frontend

Em outro terminal, sirva a pasta `frontend/` por HTTP. Abrir os arquivos direto pelo navegador não funciona, porque os módulos JavaScript exigem HTTP.

```bash
cd frontend
python3 -m http.server 5500
```

Abra `http://localhost:5500/login.html`.

Se a API estiver em outro endereço, defina `window.SWEETLOG_API_URL` antes de carregar `js/app.js`. Detalhes no [README do frontend](frontend/README.md).

## Estrutura do repositório

```
sweetlog/
├── README.md          Este arquivo
├── backend/           API REST (ver backend/README.md)
│   ├── src/
│   ├── public/uploads/
│   ├── database.sql
│   └── .env           Não versionar
└── frontend/          Páginas e scripts (ver frontend/README.md)
    ├── *.html
    ├── css/
    └── js/
```