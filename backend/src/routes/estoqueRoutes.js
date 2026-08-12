const express = require('express')
const router = express.Router()
const EstoqueController = require('../controllers/EstoqueController')
const uploadEstoque= require('../config/multer');

router.get('/', EstoqueController.listar)
router.get('/:id', EstoqueController.buscarPorId)
router.post('/', uploadEstoque.single('imagem'), EstoqueController.cadastrar)
router.put('/:id', uploadEstoque.single('imagem'), EstoqueController.atualizar)
router.delete('/:id', EstoqueController.deletar)

module.exports = router