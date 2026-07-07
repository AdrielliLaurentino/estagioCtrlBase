import api from "./api";
const PATH = "/unidades";

export const unidadeService = {
  buscarDadosNegocio: async () => {
    const response = await api.get(`${PATH}/dados-negocio`);
    return response.data;
  }
};