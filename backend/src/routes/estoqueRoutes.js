const express = require('express')
const router = express.Router()
const EstoqueController = require('../controllers/EstoqueController')
const MovimentacaoEstoqueController = require('../controllers/MovimentacaoEstoqueController')
const { uploadEstoqueEntrada } = require('../config/multer')
const { autenticar, autorizar, CARGOS } = require('../middlewares/auth')

const leitura = [CARGOS.ADMINISTRADOR, CARGOS.ALMOXARIFADO, CARGOS.LOGISTICA, CARGOS.COMPRAS]
const escrita = [CARGOS.ADMINISTRADOR, CARGOS.ALMOXARIFADO, CARGOS.LOGISTICA]
const entrada = [...escrita, CARGOS.COMPRAS]

router.use(autenticar)
router.get('/movimentacoes', autorizar(...leitura), MovimentacaoEstoqueController.listar)
router.get('/resumo', autorizar(...leitura), EstoqueController.resumo)
router.get('/produto/:idProduto', autorizar(...leitura), EstoqueController.listarPorProduto)
router.get('/', autorizar(...leitura), EstoqueController.listar)
router.get('/:id/movimentacoes', autorizar(...leitura), MovimentacaoEstoqueController.listarPorEstoque)
router.get('/:id', autorizar(...leitura), EstoqueController.buscarPorId)
router.post('/:id/saida', autorizar(...escrita), EstoqueController.diminuirQuantidade)
router.post('/', autorizar(...entrada), uploadEstoqueEntrada.single('nota_fiscal'), EstoqueController.cadastrar)
router.put('/:id', autorizar(...entrada), uploadEstoqueEntrada.single('nota_fiscal'), EstoqueController.atualizar)
router.delete('/:id', autorizar(...escrita), EstoqueController.deletar)

module.exports = router
