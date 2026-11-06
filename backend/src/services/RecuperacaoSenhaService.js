const crypto = require('crypto')
const bcrypt = require('bcryptjs')
const RecuperacaoSenhaRepository = require('../repositories/RecuperacaoSenhaRepository')
const { normalizarTelefone: validarTelefone } = require('../utils/cadastro')

class RecuperacaoSenhaService {
    async solicitar(dados) {
        this.validarIntegracaoSms()
        const telefone = this.normalizarTelefone(dados.telefone)
        const respostaPadrao = {
            sucesso: true,
            mensagem: 'Se o telefone estiver associado a uma conta, você receberá um código de verificação.'
        }

        const funcionarios = await RecuperacaoSenhaRepository.selectFuncionariosPorTelefone(telefone)
        if (funcionarios.length !== 1) return respostaPadrao

        const ultima = await RecuperacaoSenhaRepository.selectUltimaSolicitacao(funcionarios[0].numero_matricula)
        if (ultima && Number(ultima.segundos_desde) < 60) {
            throw { status: 429, mensagem: 'Aguarde 60 segundos antes de solicitar outro código' }
        }

        const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0')
        const codigoHash = await bcrypt.hash(codigo, 10)
        const id = await RecuperacaoSenhaRepository.criar(funcionarios[0].numero_matricula, codigoHash)

        try {
            await this.enviarSms(telefone, `Seu código de recuperação do SweetLog é ${codigo}. Ele expira em 10 minutos.`)
        } catch (error) {
            await RecuperacaoSenhaRepository.cancelar(id)
            throw error
        }

        return respostaPadrao
    }

    async verificar(dados) {
        const telefone = this.normalizarTelefone(dados.telefone)
        const codigo = String(dados.codigo || '').trim()
        if (!/^\d{6}$/.test(codigo)) throw { status: 400, mensagem: 'O código deve conter 6 dígitos' }

        const funcionarios = await RecuperacaoSenhaRepository.selectFuncionariosPorTelefone(telefone)
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
        const telefone = this.normalizarTelefone(dados.telefone)
        const token = String(dados.token_redefinicao || '').trim()
        if (!/^[a-f0-9]{64}$/i.test(token)) throw { status: 400, mensagem: 'Token de redefinição inválido ou expirado' }

        const senha = dados.nova_senha !== undefined ? dados.nova_senha : dados.senha
        if (typeof senha !== 'string' || senha.trim().length < 8 || Buffer.byteLength(senha.trim(), 'utf8') > 72) {
            throw { status: 400, mensagem: 'A nova senha deve ter ao menos 8 caracteres e no máximo 72 bytes em UTF-8' }
        }

        const funcionarios = await RecuperacaoSenhaRepository.selectFuncionariosPorTelefone(telefone)
        if (funcionarios.length !== 1) throw { status: 400, mensagem: 'Token de redefinição inválido ou expirado' }
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
        const senhaHash = await bcrypt.hash(senha.trim(), 10)
        const redefinida = await RecuperacaoSenhaRepository.redefinirSenha(
            funcionarios[0].numero_matricula, tokenHash, senhaHash
        )
        if (!redefinida) throw { status: 400, mensagem: 'Token de redefinição inválido ou expirado' }

        return { sucesso: true, mensagem: 'Senha redefinida com sucesso' }
    }

    normalizarTelefone(valor) {
        return validarTelefone(valor)
    }

    validarIntegracaoSms() {
        const { SMS_TWILIO_ACCOUNT_SID, SMS_TWILIO_AUTH_TOKEN, SMS_TWILIO_FROM } = process.env
        if (!SMS_TWILIO_ACCOUNT_SID || !SMS_TWILIO_AUTH_TOKEN || !SMS_TWILIO_FROM) {
            throw {
                status: 503,
                mensagem: 'Recuperação por SMS indisponível: configure as credenciais do provedor Twilio no ambiente da API'
            }
        }
    }

    async enviarSms(telefone, mensagem) {
        const sid = process.env.SMS_TWILIO_ACCOUNT_SID
        const token = process.env.SMS_TWILIO_AUTH_TOKEN
        const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`
        const corpo = new URLSearchParams({
            To: `+55${telefone}`,
            From: process.env.SMS_TWILIO_FROM,
            Body: mensagem
        })
        let resposta
        try {
            resposta = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: corpo,
                signal: AbortSignal.timeout(10000)
            })
        } catch (error) {
            console.error('Falha de comunicação com o provedor de SMS:', error.message)
            throw { status: 502, mensagem: 'Não foi possível enviar o código por SMS. Tente novamente mais tarde' }
        }

        if (!resposta.ok) {
            const detalhe = await resposta.text()
            console.error('Twilio recusou o envio do SMS:', detalhe)
            throw { status: 502, mensagem: 'Não foi possível enviar o código por SMS. Tente novamente mais tarde' }
        }
    }

}

module.exports = new RecuperacaoSenhaService()
