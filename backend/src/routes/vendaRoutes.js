const express = require('express')
const router = express.Router()
const VendaController = require('../controllers/VendaController')
const { uploadEstoqueSaida } = require('../config/multer')

router.get('/', VendaController.listar)
router.get('/:id', VendaController.buscarPorId)
router.post('/', uploadEstoqueSaida.single('nota_fiscal'), VendaController.cadastrar)
router.put('/:id', uploadEstoqueSaida.single('nota_fiscal'), VendaController.atualizar)
router.delete('/:id', VendaController.deletar)

module.exports = router