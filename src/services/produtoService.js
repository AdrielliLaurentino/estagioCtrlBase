import api from "./api";

const PATH = "/produtos";

export const produtoService = {
  cadastrar: (payload) => api.post(PATH, payload),
  
  atualizar: (id, payload) => api.put(`${PATH}/${id}`, payload),
  
  consultarNCM: async (ean) => {
    const response = await api.get(`${PATH}/consultar-ncm/${ean}`);
    return response.data;
  },
  
  listar: async (page = 0, size = 100, signal) => {
    const response = await api.get(`${PATH}?page=${page}&size=${size}`, { signal });
    return response.data;
  },
  
  excluir: (id) => api.delete(`${PATH}/${id}`),
  
  alterarStatus: (id, ativo) => api.patch(`${PATH}/${id}/status`, { ativo })
};