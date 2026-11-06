const express = require('express')
const router = express.Router()
const FuncionarioController = require('../controllers/FuncionarioController')
const { autenticar, autorizar, TODOS_OS_CARGOS } = require('../middlewares/auth')
const { limitarTentativasLogin } = require('../middlewares/loginRateLimit')

// Login e recuperação precisam continuar acessíveis sem uma sessão ativa.
router.post('/login', limitarTentativasLogin, FuncionarioController.login)
router.post('/recuperar-senha', FuncionarioController.recuperarSenha)
router.post('/verificar-codigo', FuncionarioController.verificarCodigo)
router.post('/redefinir-senha', FuncionarioController.redefinirSenha)

// Todos os seis cargos do diagrama compartilham as operações de funcionários.
router.use(autenticar, autorizar(...TODOS_OS_CARGOS))
router.get('/', FuncionarioController.listar)
router.get('/:id', FuncionarioController.buscarPorId)
router.post('/', FuncionarioController.cadastrar)
router.put('/:id', FuncionarioController.atualizar)
router.delete('/:id', FuncionarioController.deletar)

module.exports = router
