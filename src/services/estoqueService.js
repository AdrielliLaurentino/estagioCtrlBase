import api from "./api";

const PATH = "/estoque";

export const estoqueService = {
  registrarEntrada: (payload) => api.post(`${PATH}/entrada/lote`, payload),
  
  registrarPerda: (payload) => api.post(`${PATH}/perdas`, payload),

  listarMovimentacoes: async (params = {}) => {
    const response = await api.get(`${PATH}/movimentacoes`, { params });
    return response.data; 
  },

  listarPerdas: async () => {
    const response = await api.get(`${PATH}/perdas`);
    return response.data; 
  }
};