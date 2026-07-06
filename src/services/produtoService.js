import { apiFetch } from "./api";

const PATH = "/produtos";

export const produtoService = {
  cadastrar: (payload) => apiFetch(PATH, { method: "POST", body: JSON.stringify(payload) }),
  
  atualizar: (id, payload) => apiFetch(`${PATH}/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  
  consultarNCM: async (ean) => {
    const response = await apiFetch(`${PATH}/consultar-ncm/${ean}`);
    return response.json();
  },
  
  listar: async (page = 0, size = 100, signal) => {
    const response = await apiFetch(`${PATH}?page=${page}&size=${size}`, { signal });
    return response.json();
  },
  
  excluir: (id) => apiFetch(`${PATH}/${id}`, { method: "DELETE" }),
  
  alterarStatus: (id, ativo) => apiFetch(`${PATH}/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ ativo })
  })
};