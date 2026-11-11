const pool = require('../config/database')

class SaldoDiarioRepository {
    async selectHoje() {
        const [rows] = await pool.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hoje")
        return rows[0].hoje
    }

    async selectResumo(data) {
        const [resumoRows] = await pool.query(`
            SELECT
                COUNT(DISTINCT v.id_venda) AS total_vendas,
                COALESCE(SUM(vi.quantidade_venda_item), 0) AS itens_vendidos,
                COALESCE(SUM(vi.quantidade_venda_item * vi.preco_unitario), 0) AS faturamento_bruto
            FROM tbl_vendas v
            LEFT JOIN tbl_vendas_itens vi ON vi.id_venda = v.id_venda
            WHERE v.data_pedido = ?
        `, [data])

        const [vendasPorProduto] = await pool.query(`
            SELECT p.id_produto, p.nome AS nome_produto, p.imagem,
                   SUM(vi.quantidade_venda_item) AS quantidade_vendida,
                   SUM(vi.quantidade_venda_item * vi.preco_unitario) AS valor_total
            FROM tbl_vendas v
            INNER JOIN tbl_vendas_itens vi ON vi.id_venda = v.id_venda
            INNER JOIN tbl_estoques e ON e.id_estoque = vi.id_estoque
            INNER JOIN tbl_produtos p ON p.id_produto = e.id_produto
            WHERE v.data_pedido = ?
            GROUP BY p.id_produto, p.nome, p.imagem
            ORDER BY valor_total DESC, quantidade_vendida DESC
            LIMIT 10
        `, [data])

        const [vendas] = await pool.query(`
            SELECT v.id_venda, v.comprador, v.data_pedido,
                   COUNT(vi.id_venda_item) AS quantidade_itens,
                   COALESCE(SUM(vi.quantidade_venda_item * vi.preco_unitario), 0) AS valor_total
            FROM tbl_vendas v
            LEFT JOIN tbl_vendas_itens vi ON vi.id_venda = v.id_venda
            WHERE v.data_pedido = ?
            GROUP BY v.id_venda
            ORDER BY v.id_venda DESC
        `, [data])

        const anterior = await this.selectFaturamento(data)
        const atual = Number(resumoRows[0].faturamento_bruto || 0)
        const faturamentoAnterior = Number(anterior || 0)
        let variacaoPercentual = null
        if (faturamentoAnterior > 0) {
            variacaoPercentual = Number((((atual - faturamentoAnterior) / faturamentoAnterior) * 100).toFixed(2))
        } else if (atual > 0) {
            variacaoPercentual = null
        } else {
            variacaoPercentual = 0
        }

        return {
            data,
            total_vendas: Number(resumoRows[0].total_vendas || 0),
            itens_vendidos: Number(resumoRows[0].itens_vendidos || 0),
            faturamento_bruto: Number(atual.toFixed(2)),
            faturamento_dia_anterior: Number(faturamentoAnterior.toFixed(2)),
            variacao_percentual: variacaoPercentual,
            maiores_vendas: vendasPorProduto.map(item => ({
                ...item,
                quantidade_vendida: Number(item.quantidade_vendida),
                valor_total: Number(Number(item.valor_total).toFixed(2))
            })),
            vendas: vendas.map(venda => ({
                ...venda,
                quantidade_itens: Number(venda.quantidade_itens),
                valor_total: Number(Number(venda.valor_total).toFixed(2))
            }))
        }
    }

    async selectFaturamento(data) {
        const [rows] = await pool.query(`
            SELECT COALESCE(SUM(vi.quantidade_venda_item * vi.preco_unitario), 0) AS total
            FROM tbl_vendas v
            INNER JOIN tbl_vendas_itens vi ON vi.id_venda = v.id_venda
            WHERE v.data_pedido = DATE_SUB(?, INTERVAL 1 DAY)
        `, [data])
        return rows[0].total
    }

    async selectHistorico(dias) {
        const [dataRows] = await pool.query("SELECT DATE_FORMAT(CURDATE(), '%Y-%m-%d') AS hoje")
        const hoje = dataRows[0].hoje
        const inicioDate = new Date(`${hoje}T00:00:00Z`)
        inicioDate.setUTCDate(inicioDate.getUTCDate() - (dias - 1))
        const inicio = inicioDate.toISOString().slice(0, 10)

        const [rows] = await pool.query(`
            SELECT v.data_pedido AS data,
                   COUNT(DISTINCT v.id_venda) AS total_vendas,
                   COALESCE(SUM(vi.quantidade_venda_item * vi.preco_unitario), 0) AS faturamento_bruto
            FROM tbl_vendas v
            LEFT JOIN tbl_vendas_itens vi ON vi.id_venda = v.id_venda
            WHERE v.data_pedido BETWEEN ? AND ?
            GROUP BY v.data_pedido
            ORDER BY v.data_pedido ASC
        `, [inicio, hoje])

        const porData = new Map(rows.map(row => [
            typeof row.data === 'string' ? row.data.slice(0, 10) : row.data.toISOString().slice(0, 10),
            row
        ]))
        const historico = []
        for (let indice = 0; indice < dias; indice++) {
            const dia = new Date(inicioDate)
            dia.setUTCDate(dia.getUTCDate() + indice)
            const data = dia.toISOString().slice(0, 10)
            const registro = porData.get(data)
            historico.push({
                data,
                total_vendas: Number(registro ? registro.total_vendas : 0),
                faturamento_bruto: Number(Number(registro ? registro.faturamento_bruto : 0).toFixed(2))
            })
        }
        return historico
    }
}

module.exports = new SaldoDiarioRepository()
