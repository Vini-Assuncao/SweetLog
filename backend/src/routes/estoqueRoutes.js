const express = require('express')
const router = express.Router()
const EstoqueController = require('../controllers/EstoqueController')
const { uploadEstoqueEntrada } = require('../config/multer');

router.get('/', EstoqueController.listar)
router.get('/:id', EstoqueController.buscarPorId)
router.post('/:id/saida', EstoqueController.diminuirQuantidade)
router.post('/', uploadEstoqueEntrada.single('nota_fiscal'), EstoqueController.cadastrar)
router.put('/:id', uploadEstoqueEntrada.single('nota_fiscal'), EstoqueController.atualizar)
router.delete('/:id', EstoqueController.deletar)

module.exports = router