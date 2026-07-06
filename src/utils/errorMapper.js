export const extrairCamposComErro = (errorData) => {
  if (errorData?.errors && Array.isArray(errorData.errors)) {
    return errorData.errors.map(err => err.campo);
  }
  
  const msgLower = (errorData?.mensagem || "").toLowerCase();
  const campos = [];
  if (msgLower.includes("e-mail") || msgLower.includes("email")) campos.push("email");
  if (msgLower.includes("cpf") || msgLower.includes("login")) campos.push("cpf");
  if (msgLower.includes("senha") || msgLower.includes("palavra-passe")) campos.push("senhaConfirmacao");
  
  return campos;
};

export const formatarMensagemErro = (errorData) => {
  if (errorData?.errors && Array.isArray(errorData.errors)) {
    return `O servidor recusou os dados:\n\n` + errorData.errors.map(err => `• ${err.campo}: ${err.mensagem}`).join("\n");
  }
  return errorData?.mensagem || "Ocorreu um erro ao processar a solicitação no servidor.";
};