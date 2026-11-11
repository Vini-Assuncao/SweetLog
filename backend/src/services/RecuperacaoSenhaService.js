const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const { Resend } = require('resend')
const RecuperacaoSenhaRepository = require('../repositories/RecuperacaoSenhaRepository')
const { validarEmail } = require('../utils/cadastro')

const MENSAGEM_ENVIO_FALHOU = 'Não foi possível enviar o código por e-mail. Tente novamente mais tarde'

class RecuperacaoSenhaService {
    constructor() {
        this.resend = null
    }

    async solicitar(dados) {
        this.validarIntegracaoEmail()
        const email = this.normalizarEmail(dados.email)
        const respostaPadrao = {
            sucesso: true,
            mensagem: 'Se o e-mail estiver associado a uma conta, você receberá um código de verificação.'
        }

        const funcionarios = await RecuperacaoSenhaRepository.selectFuncionariosPorEmail(email)
        if (funcionarios.length !== 1) return respostaPadrao

        const ultima = await RecuperacaoSenhaRepository.selectUltimaSolicitacao(funcionarios[0].numero_matricula)
        if (ultima && Number(ultima.segundos_desde) < 60) {
            throw { status: 429, mensagem: 'Aguarde 60 segundos antes de solicitar outro código' }
        }

        const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
        const codigoHash = await bcrypt.hash(codigo, 10)
        const id = await RecuperacaoSenhaRepository.criar(funcionarios[0].numero_matricula, codigoHash)

        try {
            await this.enviarCodigo(email, codigo)
        } catch (error) {
            await RecuperacaoSenhaRepository.cancelar(id)
            throw error
        }

        return respostaPadrao
    }

    async verificar(dados) {
        const email = this.normalizarEmail(dados.email)
        const codigo = String(dados.codigo || '').trim()
        if (!/^\d{6}$/.test(codigo)) throw { status: 400, mensagem: 'O código deve conter 6 dígitos' }

        const funcionarios = await RecuperacaoSenhaRepository.selectFuncionariosPorEmail(email)
        if (funcionarios.length !== 1) throw { status: 400, mensagem: 'Código inválido ou expirado' }
        const registro = await RecuperacaoSenhaRepository.selectAtual(funcionarios[0].numero_matricula)
        if (!registro || registro.verificado_em || Number(registro.tentativas) >= 5) {
            throw { status: 400, mensagem: 'Código inválido ou expirado' }
        }

        const valido = await bcrypt.compare(codigo, registro.codigo_hash)
        if (!valido) {
            await RecuperacaoSenhaRepository.incrementarTentativas(registro.id_recuperacao)
            throw { status: 400, mensagem: 'Código inválido ou expirado' }
        }

        const token = crypto.randomBytes(32).toString('hex')
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
        const codigoConfirmado = await RecuperacaoSenhaRepository.confirmarCodigo(registro.id_recuperacao, tokenHash)
        if (!codigoConfirmado) throw { status: 400, mensagem: 'Código inválido ou expirado' }
        return {
            sucesso: true,
            mensagem: 'Código verificado. O token permite redefinir a senha uma única vez nos próximos 15 minutos.',
            token_redefinicao: token
        }
    }

    async redefinir(dados) {
        const email = this.normalizarEmail(dados.email)
        const token = String(dados.token_redefinicao || '').trim()
        if (!/^[a-f0-9]{64}$/i.test(token)) throw { status: 400, mensagem: 'Token de redefinição inválido ou expirado' }

        const senha = dados.nova_senha !== undefined ? dados.nova_senha : dados.senha
        if (typeof senha !== 'string' || senha.trim().length < 8 || Buffer.byteLength(senha.trim(), 'utf8') > 72) {
            throw { status: 400, mensagem: 'A nova senha deve ter ao menos 8 caracteres e no máximo 72 bytes em UTF-8' }
        }

        const funcionarios = await RecuperacaoSenhaRepository.selectFuncionariosPorEmail(email)
        if (funcionarios.length !== 1) throw { status: 400, mensagem: 'Token de redefinição inválido ou expirado' }
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
        const senhaHash = await bcrypt.hash(senha.trim(), 10)
        const redefinida = await RecuperacaoSenhaRepository.redefinirSenha(
            funcionarios[0].numero_matricula, tokenHash, senhaHash
        )
        if (!redefinida) throw { status: 400, mensagem: 'Token de redefinição inválido ou expirado' }

        return { sucesso: true, mensagem: 'Senha redefinida com sucesso' }
    }

    normalizarEmail(valor) {
        return validarEmail(valor)
    }

    validarIntegracaoEmail() {
        const { RESEND_API_KEY, RESEND_FROM } = process.env
        if (!RESEND_API_KEY || !RESEND_FROM) {
            throw {
                status: 503,
                mensagem: 'Recuperação por e-mail indisponível: configure RESEND_API_KEY e RESEND_FROM no ambiente da API'
            }
        }
    }

    obterCliente() {
        if (!this.resend) this.resend = new Resend(process.env.RESEND_API_KEY)
        return this.resend
    }

    async enviarCodigo(email, codigo) {
        const texto = [
            'Olá,',
            '',
            `Seu código de recuperação de senha do SweetLog é ${codigo}.`,
            'Ele expira em 10 minutos.',
            '',
            'Se você não solicitou a recuperação, ignore esta mensagem.'
        ].join('\n')

        let resposta
        try {
            resposta = await this.obterCliente().emails.send({
                from: process.env.RESEND_FROM,
                to: [email],
                subject: 'Código de recuperação de senha — SweetLog',
                text: texto
            })
        } catch (error) {
            console.error('Falha de comunicação com o Resend:', error.message)
            throw { status: 502, mensagem: MENSAGEM_ENVIO_FALHOU }
        }

        if (resposta.error) {
            console.error('Resend recusou o envio do e-mail:', resposta.error.message)
            throw { status: 502, mensagem: MENSAGEM_ENVIO_FALHOU }
        }
    }
}

module.exports = new RecuperacaoSenhaService()
