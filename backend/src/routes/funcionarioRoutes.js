const express = require('express')
const router = express.Router()
const FuncionarioController = require('../controllers/FuncionarioController')
const { autenticar, autorizar, CARGOS } = require('../middlewares/auth')
const { limitarTentativasLogin, limitarTentativasCadastro } = require('../middlewares/loginRateLimit')

// Login e recuperação precisam continuar acessíveis sem uma sessão ativa.
router.post('/login', limitarTentativasLogin, FuncionarioController.login)
router.post('/cadastro', limitarTentativasCadastro, FuncionarioController.cadastrar)
router.post('/recuperar-senha', FuncionarioController.recuperarSenha)
router.post('/verificar-codigo', FuncionarioController.verificarCodigo)
router.post('/redefinir-senha', FuncionarioController.redefinirSenha)

// Somente RH e Administrador podem consultar ou administrar funcionários.
router.use(autenticar, autorizar(CARGOS.ADMINISTRADOR, CARGOS.RH))
router.get('/', FuncionarioController.listar)
router.get('/:id', FuncionarioController.buscarPorId)
router.post('/', FuncionarioController.cadastrar)
router.put('/:id', FuncionarioController.atualizar)
router.delete('/:id', FuncionarioController.deletar)

module.exports = router
