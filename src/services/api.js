const decodeJWT = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null; 
  }
};

const getStorageData = () => {
  try {
    const rawUser = localStorage.getItem("usuario") || localStorage.getItem("@CtrlBase:user");
    const user = (rawUser && rawUser !== "undefined") ? JSON.parse(rawUser) : {};
    
    let token = localStorage.getItem("@CtrlBase:token") || user?.token || "";
    token = token.replace(/['"]+/g, '').replace("Bearer ", "").trim();
    
    return { user, token };
  } catch {
    return { user: {}, token: "" };
  }
};

const BASE_URL = import.meta.env.VITE_API_URL || "";

export async function apiFetch(endpoint, options = {}) {
  const { user, token } = getStorageData();
  const payload = decodeJWT(token);

  if (payload?.exp && (payload.exp * 1000 < Date.now())) {
      window.dispatchEvent(new Event('auth:unauthorized'));
      throw new Error("Sessão expirada. Faça login novamente.");
  }

  const normalizedPath = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const apiPath = normalizedPath.startsWith("/api") 
    ? normalizedPath 
    : `/api${normalizedPath}`;

  const fullUrl = `${BASE_URL}${apiPath}`;

  const idOperador = user?.idFuncionario ?? user?.id ?? payload?.id ?? "1";
  const idUnidade = user?.idUnidade ?? user?.unidade?.idUnidade ?? user?.unidade?.id ?? user?.unidadeId ?? "1";

  const headers = {
    "Content-Type": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` }),
    "id-operador": String(idOperador),
    "id-solicitante": String(idOperador),
    "id-unidade": String(idUnidade), 
    ...options.headers,
  };

  const response = await fetch(fullUrl, { ...options, headers });

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event('auth:unauthorized'));
      throw new Error("Sessão expirada.");
    }
    
    if (response.status === 403) {
      throw new Error("Acesso negado. Verifique suas permissões.");
    }
    
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: `Erro HTTP ${response.status}` };
    }
    
    const errorMsg = errorData?.message || errorData?.detail || `Erro ${response.status}: Falha na requisição`;
    const customError = new Error(errorMsg);
    customError.status = response.status;
    customError.errors = errorData?.errors || [];
    customError.backendErrors = errorData?.errors || []; 
    
    throw customError;
  }

  return response;
}