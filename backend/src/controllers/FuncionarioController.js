const FuncionarioService = require('../services/FuncionarioService')
const RecuperacaoSenhaService = require('../services/RecuperacaoSenhaService')
const { executar } = require('./controle')
const { responderErro } = require('../utils/resposta')

class FuncionarioController {
    listar(req, res) { return executar(res, () => FuncionarioService.listar()) }
    buscarPorId(req, res) { return executar(res, () => FuncionarioService.buscarPorId(req.params.id)) }
    cadastrar(req, res) { return executar(res, () => FuncionarioService.cadastrar(req.body || {})) }
    atualizar(req, res) { return executar(res, () => FuncionarioService.atualizar(req.params.id, req.body || {})) }
    async login(req, res) {
        try {
            const resultado = await FuncionarioService.login(req.body || {})
            if (typeof req.limparTentativasLogin === 'function') req.limparTentativasLogin()
            return res.json(resultado)
        } catch (error) {
            return responderErro(res, error)
        }
    }
    recuperarSenha(req, res) { return executar(res, () => RecuperacaoSenhaService.solicitar(req.body || {})) }
    verificarCodigo(req, res) { return executar(res, () => RecuperacaoSenhaService.verificar(req.body || {})) }
    redefinirSenha(req, res) { return executar(res, () => RecuperacaoSenhaService.redefinir(req.body || {})) }
    deletar(req, res) { return executar(res, () => FuncionarioService.deletar(req.params.id)) }
}

module.exports = new FuncionarioController()
