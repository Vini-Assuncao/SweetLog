# SweetLog — Backend

API REST do SweetLog, desenvolvida com Node.js, Express 5 e MySQL. A aplicação segue a separação `routes → controllers → services → repositories`, mantendo as regras de negócio fora das rotas e as consultas SQL nos repositories.

## Requisitos

- Node.js 18 ou superior
- npm
- MySQL 8.0 ou compatível com os recursos usados no schema (colunas geradas, índices únicos e eventos)

## Instalação e execução

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env` e informe os dados do seu banco:

   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=sua_senha
   DB_NAME=sweetlog
   DB_PORT=3306
   DB_CONNECTION_LIMIT=10
   CORS_ORIGIN=http://localhost:5500
   ```

   `CORS_ORIGIN` é opcional. Quando estiver vazio, o CORS permite qualquer origem, o que facilita o desenvolvimento local. Em produção, informe as origens do frontend separadas por vírgula.

3. Prepare o banco:
   - Para uma instalação nova, execute `database.sql` em uma instância MySQL. O arquivo cria o banco, as tabelas, a view e o evento de reconciliação de alertas, além de inserir registros de exemplo.
   - Para uma instalação existente, faça backup antes de aplicar as migrations. Execute `migrations/alertas.sql` somente se a estrutura nova de alertas ainda não tiver sido aplicada. Execute `migrations/recuperacao_senha.sql` para criar a tabela usada pela recuperação de senha.
   - A estrutura de vendas esperada utiliza `tbl_vendas.nota_fiscal` e `tbl_vendas_itens.id_estoque`. Bancos antigos que ainda armazenam itens por `id_produto` precisam de migração de dados planejada; não há conversão automática porque não é possível inferir com segurança qual lote originou cada item vendido.

4. Inicie a API:

   ```bash
   npm start
   ```

   A inicialização testa a conexão com o MySQL e sincroniza os alertas antes de abrir a porta configurada. A API fica disponível, por padrão, em `http://localhost:3000`.

5. Execute os testes locais:

   ```bash
   npm test
   ```

## Configuração opcional de SMS

A recuperação de senha envia códigos por SMS usando Twilio. Para habilitar esse fluxo, configure no `.env`:

```env
SMS_TWILIO_ACCOUNT_SID=seu_account_sid
SMS_TWILIO_AUTH_TOKEN=seu_auth_token
SMS_TWILIO_FROM=+15005550006
```

`SMS_TWILIO_FROM` deve ser um número habilitado na sua conta Twilio. Sem as três variáveis, somente `POST /funcionarios/recuperar-senha` responde com HTTP 503; a verificação e a redefinição de um desafio já enviado continuam funcionando. O restante da API não depende da integração SMS.

## Rotas principais

Todas as rotas são montadas na raiz. `GET /` informa a versão e os recursos disponíveis.

| Recurso | Rotas |
|---|---|
| Dashboard | `GET /dashboard`, `GET /dashboard/resumo` |
| Saldo diário | `GET /saldo-diario`, `GET /saldo-diario/resumo`, `GET /saldo-diario/historico`, `GET /saldo-diario/exportar` |
| Matrículas | `GET/POST /matriculas`, `GET/PUT/DELETE /matriculas/:id` |
| Funcionários | `POST /funcionarios/cadastro` (matrícula pré-cadastrada, sem autenticação), `GET/POST /funcionarios`, `GET/PUT/DELETE /funcionarios/:id`, `POST /funcionarios/login` |
| Recuperação de senha | `POST /funcionarios/recuperar-senha`, `POST /funcionarios/verificar-codigo`, `POST /funcionarios/redefinir-senha` |
| Produtos | `GET/POST /produtos`, `GET/PUT/DELETE /produtos/:id` |
| Estoques | `GET/POST /estoques`, `GET/PUT/DELETE /estoques/:id`, `POST /estoques/:id/saida`, `GET /estoques/resumo`, `GET /estoques/produto/:idProduto` |
| Lotes | `GET /lotes`, `GET /lotes/resumo`, `GET /lotes/:id`, `GET /lotes/produto/:idProduto` |
| Vendas | `GET/POST /vendas`, `GET/PUT/DELETE /vendas/:id` |
| Alertas | `GET /alertas`, `GET /alertas/:id` |

`POST /funcionarios/cadastro` é público e só vincula um funcionário a uma matrícula previamente criada e ainda não utilizada. O setor é obtido da matrícula; o cadastro é limitado a 10 tentativas por IP a cada 15 minutos. A criação e administração de matrículas continuam protegidas.

Os detalhes de cada rota, filtros, exemplos de payload e regras de negócio estão em [`API-CHANGES.md`](./API-CHANGES.md).

## Arquivos enviados

As rotas de produtos, estoques e vendas recebem `multipart/form-data` quando há arquivo:

- Produtos: campo `imagem`, JPEG/JPG ou PNG, até 5 MB.
- Entrada de estoque: campo `nota_fiscal`, PDF, até 5 MB.
- Vendas: campo `nota_fiscal`, PDF, até 5 MB.

Além da extensão e do MIME informado pelo cliente, o backend verifica a assinatura do conteúdo do arquivo. Os novos caminhos gravados no banco começam com `/public/uploads/...`; arquivos antigos com o prefixo `backend/public/uploads/...` são normalizados nas respostas e tratados na remoção.

## Alertas

A API sincroniza alertas ao cadastrar, editar ou baixar produtos e lotes, e ao registrar, editar ou excluir vendas. A inicialização também faz uma reconciliação geral. O evento diário do MySQL é uma camada adicional de sincronização; o funcionamento transacional da API não depende dele.

- **Validade próxima:** lote com saldo e validade entre hoje e os próximos 30 dias.
- **Estoque vencido:** lote vencido que ainda possui saldo.
- **Estoque baixo:** produto com lotes registrados e até 20 unidades disponíveis, somando apenas lotes não vencidos.

O histórico é preservado. Por isso, produtos e lotes que tenham alertas associados não podem ser excluídos pela API.

`SET GLOBAL event_scheduler = ON` no `database.sql` exige permissão administrativa no MySQL. Configure o Event Scheduler permanentemente no servidor para manter o evento diário ativo após reinicializações.

## Observações

- O login valida matrícula e senha, mas ainda não emite JWT nem cria sessão autenticada. A autorização por perfil precisa ser adicionada antes de expor operações administrativas em produção.
- O registro de exemplo do `database.sql` ainda contém uma senha legada em texto simples apenas para compatibilidade com a base de demonstração. No primeiro login válido, a API substitui essa senha por um hash bcrypt. Cadastros novos e redefinições já armazenam hash.
- O resumo do saldo diário representa faturamento bruto calculado a partir das vendas; não representa lucro, caixa disponível ou saldo contábil, pois o schema atual não contém custos e despesas.
- A interface frontend não foi modificada e não foi conectada à API nesta etapa.
