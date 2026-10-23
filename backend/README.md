# 🍪SweetLog — Backend

> **⚠️Em desenvolvimento⚠️:** este backend ainda está incompleto. As rotas e o comportamento podem mudar, e nem todos os fluxos estão prontos para uso.

API REST do SweetLog, construída com Node.js, Express e MySQL. O sistema está organizado por recursos e separa rotas, controllers, services e repositories.

## ⚙️Tecnologias

- Node.js e Express 5
- MySQL, acessado com `mysql2`
- `dotenv` para carregar configurações locais
- `multer` para receber imagens e notas fiscais
- `bcryptjs` para hash e verificação de senhas
- `cors` para permitir requisições cross-origin

## ⌨️Requisitos

- Node.js e npm
- MySQL

## 📋Configuração e execução

1. Entre nesta pasta (`backend`) e instale as dependências:

   ```bash
   npm install
   ```

2. Crie um banco MySQL e configure o arquivo `.env` na raiz de `backend/` com as variáveis abaixo. Não compartilhe nem versione esse arquivo com credenciais reais.

   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=seu_usuario
   DB_PASSWORD=sua_senha
   DB_NAME=sweetlog
   DB_PORT=3306
   JWT_SECRET=sua_chave_jwt
   ```

   `PORT` é opcional; quando não informado, o servidor usa a porta `3000`. As demais variáveis são usadas para conectar ao banco.

3. Prepare o schema usando `database.sql`, se apropriado para o seu ambiente.

4. Inicie a API:

   ```bash
   npm start
   ```

   O servidor testa a conexão com o MySQL antes de começar a escutar. A base padrão é `http://localhost:3000`.

## 🔌Rotas disponíveis

Todas as rotas estão montadas na raiz da API. A rota `GET /` retorna uma mensagem indicando que a API está ativa.

| Recurso | Método e caminho | Descrição |
|---|---|---|
| Matrículas | `GET /matriculas` | Lista matrículas |
| Matrículas | `GET /matriculas/:id` | Busca uma matrícula pelo número |
| Matrículas | `POST /matriculas` | Cadastra matrícula |
| Matrículas | `PUT /matriculas/:id` | Atualiza matrícula |
| Matrículas | `DELETE /matriculas/:id` | Exclui matrícula, desde que não esteja vinculada a um funcionário |
| Funcionários | `GET /funcionarios` | Lista funcionários |
| Funcionários | `GET /funcionarios/:id` | Busca funcionário pelo número da matrícula |
| Funcionários | `POST /funcionarios` | Cadastra funcionário |
| Funcionários | `PUT /funcionarios/:id` | Atualiza funcionário |
| Funcionários | `POST /funcionarios/login` | Verifica matrícula e senha |
| Funcionários | `DELETE /funcionarios/:id` | Exclui funcionário |
| Produtos | `GET /produtos` | Lista produtos |
| Produtos | `GET /produtos/:id` | Busca produto pelo ID |
| Produtos | `POST /produtos` | Cadastra produto |
| Produtos | `PUT /produtos/:id` | Atualiza produto |
| Produtos | `DELETE /produtos/:id` | Exclui produto |
| Estoques | `GET /estoques` | Lista registros de estoque |
| Estoques | `GET /estoques/:id` | Busca registro de estoque pelo ID |
| Estoques | `POST /estoques` | Cadastra registro de estoque |
| Estoques | `PUT /estoques/:id` | Atualiza registro de estoque |
| Estoques | `DELETE /estoques/:id` | Exclui registro de estoque |
| Estoques | `POST /estoques/:id/saida` | Diminui a quantidade de um lote |
| Vendas | `GET /vendas` | Lista vendas e seus itens |
| Vendas | `GET /vendas/:id` | Busca uma venda e seus itens |
| Vendas | `POST /vendas` | Cadastra uma venda e baixa as quantidades dos lotes |
| Vendas | `PUT /vendas/:id` | Atualiza dados da venda e, opcionalmente, seus itens |
| Vendas | `DELETE /vendas/:id` | Exclui a venda e devolve as quantidades aos lotes |

### 💡Exemplos de requisição

Cadastro de matrícula (`Content-Type: application/json`):

```json
{
  "numero_matricula": 2001,
  "setor": "Administrativo"
}
```

Os setores atualmente aceitos pela validação da API são `RH`, `Administrativo`, `Logística`, `Compras` e `Almoxarifado`.

Cadastro de venda (`multipart/form-data`, com `itens` enviado como texto JSON):

```json
{
  "comprador": "Cliente de Exemplo",
  "data_pedido": "2026-10-23",
  "data_entrega": "2026-10-25",
  "numero_matricula": 2001,
  "itens": [
    {
      "id_estoque": 1,
      "quantidade_venda_item": 5,
      "preco_unitario": 2.5
    }
  ]
}
```

Envie também o arquivo PDF no campo `nota_fiscal`. Cada item referencia um lote pelo `id_estoque`; a criação baixa as quantidades em uma transação. Ao substituir os itens, as quantidades anteriores são devolvidas e as novas são baixadas na mesma transação. Ao excluir a venda, as quantidades são devolvidas aos lotes. O campo `numero_matricula` é opcional.

Para registrar uma saída avulsa de um lote, use `POST /estoques/:id/saida` com JSON:

```json
{
  "quantidade": 5
}
```

O endpoint rejeita saídas maiores que o saldo disponível e não cria uma venda.

Cadastro de funcionário (`Content-Type: application/json`):

```json
{
  "numero_matricula": 2001,
  "senha": "uma-senha-de-exemplo",
  "nome": "Pessoa de Exemplo",
  "telefone": "11999999999"
}
```

O telefone é opcional. A senha é armazenada com hash. O login retorna confirmação e o número da matrícula; não há emissão de token implementada atualmente.

### 📄Envio de arquivos

As rotas de criação e atualização de produtos, estoques e vendas recebem `multipart/form-data`:

- Produtos: campo de arquivo `imagem`; são aceitos JPEG/JPG e PNG, até 5 MB.
- Estoques e vendas: campo de arquivo `nota_fiscal`; são aceitos PDFs, até 5 MB.

Os dados textuais do formulário são enviados junto com o arquivo. Os arquivos ficam sob `public/uploads/produtos`, `public/uploads/notas_fiscais/entrada` (estoques) ou `public/uploads/notas_fiscais/saida` (vendas) e são servidos estaticamente pelo prefixo `/public`. Arquivos já enviados para o diretório antigo `public/uploads/notas_fiscais` permanecem no local original; novos uploads usam os diretórios separados.

Em bancos já existentes, `CREATE TABLE IF NOT EXISTS` não altera tabelas existentes. Antes de usar vendas, adicione a coluna `nota_fiscal` obrigatória em `tbl_vendas` e migre manualmente `tbl_vendas_itens`: os itens agora apontam para lotes (`id_estoque`) em vez de produtos (`id_produto`), e não é seguro converter esses IDs automaticamente.

## 🗃️   Como o projeto está organizado

```text
backend/
├── database.sql
├── package.json
├── public/
│   └── uploads/
└── src/
    ├── app.js
    ├── server.js
    ├── config/
    │   ├── database.js
    │   └── multer.js
    ├── controllers/
    │   ├── EstoqueController.js
    │   ├── FuncionarioController.js
    │   ├── MatriculaController.js
    │   ├── ProdutoController.js
    │   └── VendaController.js
    ├── repositories/
    │   ├── EstoqueRepository.js
    │   ├── FuncionarioRepository.js
    │   ├── MatriculaRepository.js
    │   ├── ProdutoRepository.js
    │   └── VendaRepository.js
    ├── routes/
    │   ├── estoqueRoutes.js
    │   ├── funcionarioRoutes.js
    │   ├── index.js
    │   ├── matriculaRoutes.js
    │   ├── produtoRoutes.js
    │   └── vendaRoutes.js
    └── services/
        ├── EstoqueService.js
        ├── FuncionarioService.js
        ├── MatriculaService.js
        ├── ProdutoService.js
        └── VendaService.js
```

- **`server.js`**: verifica a conexão com o MySQL e inicia o servidor.
- **`app.js`**: configura Express, CORS, leitura de JSON e arquivos estáticos.
- **`routes/`**: declara os caminhos HTTP e encaminha as requisições aos controllers.
- **`controllers/`**: conecta requisições/respostas HTTP às operações dos services.
- **`services/`**: contém validações e regras de negócio.
- **`repositories/`**: executa consultas e alterações no MySQL.
- **`config/`**: configura a conexão com o banco e o recebimento de arquivos.
- **`database.sql`**: define tabelas, relacionamentos, view, eventos e dados de exemplo.

O fluxo usual é `requisição → rota → controller → service → repository → MySQL`, retornando então a resposta pelo controller.