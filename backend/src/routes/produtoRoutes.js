const express = require('express')
const router = express.Router()
const ProdutoController = require('../controllers/ProdutoController')
const { uploadProduto } = require('../config/multer')
const { autenticar, autorizar, CARGOS, TODOS_OS_CARGOS } = require('../middlewares/auth')

router.use(autenticar)
router.get('/', autorizar(...TODOS_OS_CARGOS), ProdutoController.listar)
router.get('/:id', autorizar(...TODOS_OS_CARGOS), ProdutoController.buscarPorId)
router.post('/', autorizar(CARGOS.ADMINISTRADOR, CARGOS.ALMOXARIFADO, CARGOS.COMPRAS), uploadProduto.single('imagem'), ProdutoController.cadastrar)
router.put('/:id', autorizar(CARGOS.ADMINISTRADOR, CARGOS.ALMOXARIFADO, CARGOS.COMPRAS), uploadProduto.single('imagem'), ProdutoController.atualizar)
router.delete('/:id', autorizar(CARGOS.ADMINISTRADOR, CARGOS.ALMOXARIFADO), ProdutoController.deletar)

module.exports = router
