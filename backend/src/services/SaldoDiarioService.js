const SaldoDiarioRepository = require('../repositories/SaldoDiarioRepository')
const { validarData } = require('../utils/validacao')

class SaldoDiarioService {
    async resumo(dataInformada) {
        const data = dataInformada
            ? validarData(dataInformada, 'Data do relatório')
            : await SaldoDiarioRepository.selectHoje()
        return { sucesso: true, saldo: await SaldoDiarioRepository.selectResumo(data) }
    }

    async historico(diasInformados) {
        const dias = diasInformados === undefined ? 10 : Number(diasInformados)
        if (!Number.isInteger(dias) || dias < 1 || dias > 90) {
            throw { status: 400, mensagem: 'O período deve ser um número inteiro entre 1 e 90 dias' }
        }
        const historico = await SaldoDiarioRepository.selectHistorico(dias)
        return { sucesso: true, historico, total: historico.length }
    }

    async exportar(dataInformada) {
        const { saldo } = await this.resumo(dataInformada)
        const linhas = [
            ['Data', 'ID da venda', 'Comprador', 'Linhas de itens', 'Valor total'].join(';')
        ]
        for (const venda of saldo.vendas) {
            linhas.push([
                saldo.data,
                venda.id_venda,
                this.escaparCsv(venda.comprador),
                venda.quantidade_itens,
                Number(venda.valor_total).toFixed(2).replace('.', ',')
            ].join(';'))
        }
        if (saldo.vendas.length === 0) {
            linhas.push([saldo.data, '', 'Sem vendas registradas', 0, '0,00'].join(';'))
        }
        return {
            nome: `saldo-diario-${saldo.data}.csv`,
            conteudo: `\uFEFF${linhas.join('\r\n')}`
        }
    }

    escaparCsv(valor) {
        let texto = String(valor ?? '')
        if (/^[\u0000-\u0020]*[=+\-@]/.test(texto)) texto = `'${texto}`
        return /[;\"\r\n]/.test(texto) ? `\"${texto.replace(/\"/g, '\"\"')}\"` : texto
    }
}

module.exports = new SaldoDiarioService()
