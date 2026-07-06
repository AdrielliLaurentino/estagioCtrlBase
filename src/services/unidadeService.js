import { apiFetch } from "./api";
const PATH = "/unidades";

export const unidadeService = {
  buscarDadosNegocio: async () => {
    const response = await apiFetch(`${PATH}/dados-negocio`);
    return response.json();
  }
};