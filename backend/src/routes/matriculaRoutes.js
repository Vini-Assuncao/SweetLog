const express = require('express')
const router = express.Router()
const MatriculaController = require('../controllers/MatriculaController')

router.get('/', MatriculaController.listar)
router.get('/:id', MatriculaController.buscarPorId)
router.post('/', MatriculaController.cadastrar)
router.put('/:id', MatriculaController.atualizar)
router.delete('/:id', MatriculaController.deletar)

module.exports = router