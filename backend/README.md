# SweetLog — Backend

API REST do SweetLog, sistema de controle de estoque, lotes, vendas e saldo diário. Construída com Node.js, Express 5 e MySQL, com autenticação por token JWT e autorização por cargo.

## Sumário

- [Stack](#stack)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Requisitos](#requisitos)
- [Instalação e execução](#instalação-e-execução)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados](#banco-de-dados)
- [Autenticação e cargos](#autenticação-e-cargos)
- [Recuperação de senha](#recuperação-de-senha)
- [Rotas](#rotas)
- [Respostas e erros](#respostas-e-erros)
- [Upload de arquivos](#upload-de-arquivos)
- [Alertas automáticos](#alertas-automáticos)
- [Testes](#testes)
- [Deploy](#deploy)
- [Limitações conhecidas](#limitações-conhecidas)

## Stack

- Node.js 18 ou superior (`engines` em `package.json`)
- Express 5
- MySQL 8.0 ou compatível (usa colunas, índices únicos, view e evento agendado)
- `mysql2` para acesso ao banco
- `bcryptjs` para hash de senhas
- `multer` para upload de imagens e PDFs
- `resend` para envio de e-mails de recuperação de senha
- `cors` e `dotenv`

## Estrutura do projeto

A aplicação separa responsabilidades em camadas. Cada requisição passa por rota, controller, service e repository, nessa ordem.

```
src/
├── app.js                  Configura Express, CORS, arquivos estáticos e rotas
├── server.js               Testa o banco, sincroniza alertas e inicia o servidor
├── config/
│   ├── database.js         Pool de conexões MySQL
│   └── multer.js           Configuração de upload e validação de imagem e PDF
├── routes/                 Definição das rotas, autenticação e autorização
├── controllers/            Recebe a requisição e devolve a resposta
├── services/               Regras de negócio e validações
├── repositories/           Consultas SQL
├── middlewares/            Autenticação, autorização, rate limit e tratamento de erros
└── utils/                  JWT, cargos, validações, arquivos e cadastro
public/uploads/             Imagens de produtos e notas fiscais em PDF
database.sql                Schema, view e evento de reconciliação de alertas
```

Regras de negócio ficam nos services. Os repositories não conhecem HTTP, e os controllers não contêm SQL.

## Requisitos

- Node.js 18 ou superior
- npm
- MySQL 8.0 ou compatível

## Instalação e execução

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Crie o arquivo `.env` na raiz do projeto com as variáveis descritas em [Variáveis de ambiente](#variáveis-de-ambiente).

3. Prepare o banco. Veja [Banco de dados](#banco-de-dados).

4. Inicie a API:

   ```bash
   npm start
   ```

   Na inicialização, a API testa a conexão com o MySQL e sincroniza os alertas antes de abrir a porta. Se o banco não responder, o processo encerra com erro.

   Por padrão, a API responde em `http://localhost:3000`. Para confirmar que está no ar, acesse `GET /`.

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Descrição |
|---|---|---|---|
| `PORT` | não | `3000` | Porta HTTP da API |
| `DB_HOST` | não | `localhost` | Host do MySQL |
| `DB_PORT` | não | `3306` | Porta do MySQL |
| `DB_USER` | não | `root` | Usuário do MySQL |
| `DB_PASSWORD` | não | vazio | Senha do MySQL |
| `DB_NAME` | não | `sweetlog` | Nome do banco |
| `DB_CONNECTION_LIMIT` | não | `10` | Tamanho máximo do pool de conexões |
| `JWT_SECRET` | sim | — | Segredo para assinar os tokens. Mínimo de 12 caracteres; recomenda-se 32 ou mais |
| `CORS_ORIGIN` | não | qualquer origem | Origens permitidas, separadas por vírgula. Em produção, informe o domínio do frontend |
| `RESEND_API_KEY` | para recuperação de senha | — | Chave de API do Resend |
| `RESEND_FROM` | para recuperação de senha | — | Remetente, em um domínio verificado no Resend. Ex.: `SweetLog <no-reply@seudominio.com.br>` |

Exemplo de `.env`:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=sweetlog
DB_CONNECTION_LIMIT=10
JWT_SECRET=troque-por-uma-chave-longa-e-aleatoria
CORS_ORIGIN=http://localhost:5500
RESEND_API_KEY=re_xxxxxxxxx
RESEND_FROM=SweetLog <no-reply@seudominio.com.br>
```

Sem `RESEND_API_KEY` e `RESEND_FROM`, apenas `POST /funcionarios/recuperar-senha` responde com HTTP 503. O restante da API funciona normalmente.

Sem `JWT_SECRET` válido, a API não consegue emitir nem validar tokens. Por isso, não use um valor de exemplo em produção.

## Banco de dados

O arquivo `database.sql` cria o banco `sweetlog`, as tabelas, a view `vw_movimentacoes`, a tabela de recuperação de senha e o evento `evt_reconciliar_alertas`. Ele não insere dados de exemplo.

### Instalação nova

```bash
mysql -u root -p < database.sql
```

Depois, crie a primeira matrícula diretamente no banco ou por outro meio administrativo, já que a criação de matrículas exige login com cargo de Administrador ou RH.

### Event Scheduler

O evento diário de reconciliação de alertas depende do Event Scheduler do MySQL. O `database.sql` tenta ativá-lo com `SET GLOBAL event_scheduler = ON`, o que exige privilégio administrativo. Para que ele continue ativo após reinicializações do servidor, configure `event_scheduler=ON` no arquivo de configuração do MySQL.

### Migrações

A pasta `migrations/` contém scripts para atualizar bancos já existentes. Use-os apenas quando a instalação anterior não tiver a estrutura atual, e sempre com backup antes.

- `migrations/alertas.sql`: estrutura nova de alertas.
- `migrations/recuperacao_senha.sql`: cria a tabela `tbl_recuperacao_senha`.
- `migrations/recuperacao_senha_email.sql`: troca o telefone do funcionário pelo e-mail. Adiciona `email` com índice único e remove `telefone`. Os telefones existentes são descartados, e os funcionários ficam sem e-mail até que o RH ou o Administrador o informe.

Em bancos antigos, as vendas precisam usar `tbl_vendas.nota_fiscal` e `tbl_vendas_itens.id_estoque`. Bases que ainda guardam itens por `id_produto` exigem uma migração de dados planejada, porque não é possível inferir com segurança de qual lote cada item vendido saiu.

## Autenticação e cargos

### Login

`POST /funcionarios/login` recebe a matrícula e a senha:

```json
{ "numero_matricula": 1001, "senha": "sua-senha" }
```

Em caso de sucesso, a resposta traz o token e os dados do funcionário:

```json
{
  "sucesso": true,
  "mensagem": "Login realizado com sucesso",
  "token": "eyJhbGciOi...",
  "tipo_token": "Bearer",
  "expira_em_segundos": 28800,
  "funcionario": { "numero_matricula": 1001, "nome": "...", "setor": "Administrador" }
}
```

O token é um JWT assinado com HMAC SHA-256, válido por 8 horas. Envie-o no cabeçalho:

```
Authorization: Bearer <token>
```

A cada requisição protegida, o middleware consulta o funcionário no banco. Por isso, mudanças de cargo e desligamentos têm efeito imediato, sem esperar o token expirar.

Senhas são armazenadas com bcrypt. Registros antigos em texto simples são convertidos para hash no primeiro login válido.

O login é limitado a 10 tentativas por IP e matrícula a cada 15 minutos.

### Cargos

O cargo do funcionário é o campo `setor`. Os valores válidos são:

- Administrador
- RH
- Administrativo
- Logística
- Compras
- Almoxarifado

### Permissões por módulo

| Módulo | Acesso |
|---|---|
| Matrículas | Administrador, RH |
| Funcionários (administração) | Administrador, RH |
| Dashboard | Administrador, Administrativo, Almoxarifado, Logística |
| Saldo diário | Administrador, Administrativo |
| Produtos (leitura) | Todos os cargos |
| Produtos (criar e editar) | Administrador, Almoxarifado, Compras |
| Produtos (excluir) | Administrador, Almoxarifado |
| Estoque (leitura) | Administrador, Almoxarifado, Logística, Compras |
| Estoque (entrada) | Administrador, Almoxarifado, Logística, Compras |
| Estoque (saída e exclusão) | Administrador, Almoxarifado, Logística |
| Lotes | Administrador, Almoxarifado, Logística, Compras |
| Vendas | Administrador, Administrativo, Almoxarifado, Logística |
| Alertas | Administrador, Compras, Almoxarifado |

As rotas de cadastro e recuperação de senha (`/funcionarios/cadastro`, `/funcionarios/login`, `/funcionarios/recuperar-senha`, `/funcionarios/verificar-codigo` e `/funcionarios/redefinir-senha`) são públicas.

## Recuperação de senha

O fluxo tem três etapas e usa o e-mail cadastrado do funcionário:

1. **`POST /funcionarios/recuperar-senha`** recebe `{ "email": "..." }` e envia um código de 6 dígitos válido por 10 minutos. A resposta é sempre a mesma, exista ou não o e-mail, para não revelar quais contas existem. Há um intervalo mínimo de 60 segundos entre solicitações do mesmo funcionário.
2. **`POST /funcionarios/verificar-codigo`** recebe `{ "email": "...", "codigo": "123456" }`. Após 5 tentativas erradas, o código deixa de funcionar. Em caso de sucesso, devolve `token_redefinicao`.
3. **`POST /funcionarios/redefinir-senha`** recebe `{ "email": "...", "token_redefinicao": "...", "nova_senha": "..." }`. O token vale por 15 minutos e só pode ser usado uma vez. A nova senha deve ter entre 8 caracteres e 72 bytes em UTF-8.

O e-mail é o único contato usado. O sistema não armazena telefone de funcionário.

## Rotas

Todas as rotas são montadas na raiz. `GET /` lista os recursos disponíveis. Os caminhos abaixo são relativos à base da API.

| Recurso | Método e caminho |
|---|---|
| Dashboard | `GET /dashboard`, `GET /dashboard/resumo` |
| Saldo diário | `GET /saldo-diario`, `GET /saldo-diario/resumo`, `GET /saldo-diario/historico`, `GET /saldo-diario/exportar` |
| Matrículas | `GET /matriculas`, `POST /matriculas`, `GET /matriculas/:id`, `PUT /matriculas/:id`, `DELETE /matriculas/:id` |
| Funcionários (público) | `POST /funcionarios/cadastro`, `POST /funcionarios/login` |
| Recuperação de senha (público) | `POST /funcionarios/recuperar-senha`, `POST /funcionarios/verificar-codigo`, `POST /funcionarios/redefinir-senha` |
| Funcionários (administração) | `GET /funcionarios`, `POST /funcionarios`, `GET /funcionarios/:id`, `PUT /funcionarios/:id`, `DELETE /funcionarios/:id` |
| Produtos | `GET /produtos`, `POST /produtos`, `GET /produtos/:id`, `PUT /produtos/:id`, `DELETE /produtos/:id` |
| Estoques | `GET /estoques`, `POST /estoques`, `GET /estoques/:id`, `PUT /estoques/:id`, `DELETE /estoques/:id`, `POST /estoques/:id/saida`, `GET /estoques/resumo`, `GET /estoques/produto/:idProduto`, `GET /estoques/movimentacoes`, `GET /estoques/:id/movimentacoes` |
| Lotes | `GET /lotes`, `GET /lotes/resumo`, `GET /lotes/:id`, `GET /lotes/produto/:idProduto` |
| Vendas | `GET /vendas`, `POST /vendas`, `GET /vendas/:id`, `PUT /vendas/:id`, `DELETE /vendas/:id` |
| Alertas | `GET /alertas`, `GET /alertas/:id` |

Notas:

- `POST /funcionarios/cadastro` vincula um funcionário a uma matrícula já criada e ainda sem uso. O setor vem da matrícula, e o cadastro tem limite de 10 tentativas por IP a cada 15 minutos.
- `POST /estoques/:id/saida` registra a saída de quantidade de um lote, sem excluir o registro.
- Os filtros, os campos de cada payload e as regras de cada endpoint devem ser consultados nos controllers e services correspondentes, porque esta página não repete esses detalhes.

## Respostas e erros

As respostas seguem o formato abaixo. Sucesso e erro sempre trazem o campo `sucesso`:

```json
{ "sucesso": false, "mensagem": "Descrição do erro" }
```

| Status | Quando |
|---|---|
| 400 | Dados inválidos ou campos obrigatórios ausentes |
| 401 | Token ausente, inválido ou expirado; ou credenciais incorretas |
| 403 | Cargo sem permissão para a operação |
| 404 | Recurso não encontrado, ou rota inexistente |
| 409 | Conflito, como e-mail já em uso, dados duplicados ou exclusão bloqueada por vínculos |
| 429 | Limite de tentativas excedido (`Retry-After` informa a espera) |
| 502 | Falha ao enviar o e-mail de recuperação |
| 503 | Recurso indisponível por falta de configuração, como o envio de e-mails |

Erros inesperados são registrados no console e retornam 500 com a mensagem genérica `Erro interno do servidor`. Arquivos acima de 5 MB ou de tipo não permitido retornam 400, com `codigo` informando o motivo quando disponível.

## Upload de arquivos

As rotas que aceitam arquivo usam `multipart/form-data`:

| Rota | Campo | Formato | Limite |
|---|---|---|---|
| Produtos (`POST` e `PUT`) | `imagem` | JPEG, JPG ou PNG | 5 MB |
| Entrada de estoque (`POST` e `PUT`) | `nota_fiscal` | PDF | 5 MB |
| Vendas (`POST` e `PUT`) | `nota_fiscal` | PDF | 5 MB |

Além da extensão e do MIME informados pelo cliente, o backend confere a assinatura real do conteúdo (magic bytes). Um arquivo renomeado não passa na validação.

Os arquivos são gravados em `public/uploads/` e servidos em `/public/uploads/...`. Os caminhos salvos no banco começam com `/public/uploads/`. Registros antigos com o prefixo `backend/public/uploads/` são normalizados nas respostas e tratados corretamente na remoção.

## Alertas automáticos

Os alertas são sincronizados automaticamente ao cadastrar, editar ou baixar produtos e lotes, e ao registrar, editar ou excluir vendas. A inicialização do servidor também faz uma reconciliação geral. O evento diário do MySQL é uma camada adicional; a consistência transacional da API não depende dele.

| Tipo | Regra |
|---|---|
| Validade próxima | Lote com saldo e validade entre hoje e os próximos 30 dias |
| Estoque vencido | Lote vencido que ainda tem saldo |
| Estoque baixo | Produto com lotes registrados e até 20 unidades disponíveis, somando apenas lotes não vencidos |

O histórico é preservado. Produtos e lotes com alertas associados não podem ser excluídos pela API.

## Limitações conhecidas

- A suíte de testes ainda não existe.
- O rate limit de login e cadastro fica em memória. Com mais de uma instância da API, cada uma mantém seus próprios contadores.
- Os arquivos enviados ficam no disco local. Em ambientes com várias instâncias, é preciso um armazenamento compartilhado.
- O resumo do saldo diário é faturamento bruto calculado a partir das vendas. Não representa lucro nem caixa, porque o schema não tem custos nem despesas.
- Este README não repete todos os filtros e campos de cada endpoint. Consulte os controllers e services de cada módulo para os detalhes.