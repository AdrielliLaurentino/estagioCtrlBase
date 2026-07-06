import { useAuth } from "../context/AuthContext";

export function useCurrentUnit() {
  const { user } = useAuth();

  const rawUser = localStorage.getItem("usuario") || localStorage.getItem("@CtrlBase:user");
  const localUser = rawUser && rawUser !== "undefined" ? JSON.parse(rawUser) : {};
  const currentUser = user || localUser;

  const idUnidade = currentUser?.idUnidade 
    ?? currentUser?.unidade?.idUnidade 
    ?? currentUser?.unidade?.id 
    ?? currentUser?.unidadeId 
    ?? currentUser?.id_unidade
    ?? (typeof currentUser?.unidade === "number" ? currentUser?.unidade : 1);

  return Number(idUnidade);
}