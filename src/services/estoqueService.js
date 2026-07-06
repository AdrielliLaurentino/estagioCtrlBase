import { apiFetch } from "./api";

const PATH = "/estoque";

export const estoqueService = {

  registrarEntrada: (payload) => 
    apiFetch(`${PATH}/entrada/lote`, { 
      method: "POST", 
      body: JSON.stringify(payload) 
    }),
  
  registrarPerda: (payload) => 
    apiFetch(`${PATH}/perdas`, { 
      method: "POST", 
      body: JSON.stringify(payload) 
    }),

  listarMovimentacoes: async (params = {}) => {

    const query = new URLSearchParams(params).toString();
    const response = await apiFetch(`${PATH}/movimentacoes?${query}`);
    return response.json(); 
  },

  listarPerdas: async () => {
    const response = await apiFetch(`${PATH}/perdas`);
    return response.json(); 
  }
};