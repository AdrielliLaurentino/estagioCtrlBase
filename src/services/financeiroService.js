import api from './api';

export const financeiroService = {
  registrarVenda: (venda) => api.post('/vendas', venda),
  listarVendas: (status) => api.get('/vendas', { params: { status } }),

  abrirCaixa: (dados) => api.post('/caixas/abrir', dados),
  fecharCaixa: (id, dados) => api.post(`/caixas/fechar/${id}`, dados),
  
  registrarMovimentacao: (idCaixa, tipo, valor, motivo) => 
    api.post(`/caixas/${idCaixa}/movimentacao`, { tipo, valor, motivo }),

  getResumoFuncionario: (idFuncionario) => api.get(`/caixas/meu-resumo/${idFuncionario}`)
};