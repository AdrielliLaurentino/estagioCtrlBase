import React, { useState, useEffect } from "react";
import { X, Unlock, AlertCircle, RefreshCw, Mail, Eye, EyeOff } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { apiFetch } from "../../services/api";

const CustomInput = ({ name, control, label, isPassword, showPassState, setShowPassState, required, type = "text", icon: Icon }) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <Controller
      name={name} 
      control={control}
      render={({ field: { onChange, onBlur, value }, fieldState: { error } }) => {
        const hasValue = Boolean(value && value.length > 0);
        
        return (
          <div className="relative w-full mb-6 group">
            {Icon && <Icon className={`absolute left-0 top-1/2 -translate-y-1/2 transition-colors duration-300 ${isFocused ? "text-red-700" : "text-gray-400"}`} size={18} />}
            
            <input
              id={name} 
              type={isPassword && !showPassState ? "password" : type}
              className={`w-full py-2 text-base text-gray-800 bg-transparent border-b outline-none transition-all duration-300 ${Icon ? "pl-8" : ""} ${
                error ? "border-red-500" : "border-gray-200 focus:border-red-700"
              }`}
              value={value || ""} 
              onChange={onChange} 
              onFocus={() => setIsFocused(true)} 
              onBlur={(e) => { setIsFocused(false); onBlur(e); }}
              autoComplete={isPassword ? "new-password" : "off"}
              data-lpignore="true" 
            />
            
            <label 
              htmlFor={name} 
              className={`absolute transition-all duration-300 pointer-events-none flex items-center ${Icon ? "left-8" : "left-0"} ${
                hasValue || isFocused ? "-top-5 text-xs text-red-700 font-medium" : "top-2 text-base text-gray-400"
              }`}
            >
              {label} {required && <span className="ml-1 text-red-700">*</span>}
            </label>
            
            {isPassword && hasValue && (
              <button 
                type="button" 
                onPointerDown={(e) => e.preventDefault()}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-700 transition-colors" 
                onClick={() => setShowPassState(!showPassState)}
              >
                {showPassState ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
            
            {error && <span className="absolute -bottom-5 left-0 text-[11px] text-red-500 font-medium animate-in fade-in">{error.message}</span>}
          </div>
        );
      }}
    />
  );
};

export default function ModalEntrada({ isOpen, onClose, authData, onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [erroGeral, setErroGeral] = useState("");
  const [mensagemSucesso, setMensagemSucesso] = useState("");
  const [senhaExpirada, setSenhaExpirada] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfirmNovaSenha, setShowConfirmNovaSenha] = useState(false);

  const { control: controlSenha, handleSubmit: handleSubmitSenha, reset: resetSenha } = useForm({
    resolver: yupResolver(yup.object({
      novaSenha: yup.string().required("Obrigatória").min(6, "Mínimo de 6 caracteres"),
      confirmarNovaSenha: yup.string().required("Obrigatória").oneOf([yup.ref('novaSenha')], "As senhas não coincidem")
    })),
    mode: "onBlur" 
  });

  const { control: controlResend, handleSubmit: handleSubmitResend, reset: resetResend, setValue } = useForm({
    resolver: yupResolver(yup.object({
      emailResend: yup.string().email("Formato de e-mail inválido").required("O e-mail é obrigatório")
    })),
    mode: "onChange"
  });

  useEffect(() => {
    if (authData?.login && authData.login.includes("@")) {
      setValue("emailResend", authData.login);
    }
  }, [authData, setValue]);

  if (!isOpen) return null;

  const fecharModal = () => {
    resetSenha();
    resetResend();
    setErroGeral("");
    setMensagemSucesso("");
    setSenhaExpirada(false);
    onClose();
  };

  const extrairErro = (err) => {
    if (err.backendErrors && err.backendErrors.length > 0) {
      return err.backendErrors.map(e => e.mensagem || e.defaultMessage).join(" | ");
    }
    return err.message || "Ocorreu um erro inesperado.";
  };

  const onSubmitTrocaSenha = async (data) => {
    setLoading(true); 
    setErroGeral("");
    
    try {
      const payload = { login: authData?.login, novaSenha: data.novaSenha };
      const customHeaders = {};
      
      if (authData?.token) {
          customHeaders["Authorization"] = `Bearer ${authData.token}`;
      }
    
      await apiFetch("/auth/change-temp-password", {
        method: "POST", 
        headers: customHeaders,
        body: JSON.stringify(payload)
      });
      
      fecharModal();
      onLoginSuccess({ ...authData, requerTrocaSenha: false });
      
    } catch (err) { 
      const msgErro = extrairErro(err);
      setErroGeral(msgErro); 
      
      if (msgErro.includes("403") || msgErro.toLowerCase().includes("expirad")) {
          setSenhaExpirada(true);
      }
    } finally { 
      setLoading(false); 
    }
  };

  const onSubmitResend = async (data) => {
    setLoading(true); 
    setErroGeral("");
    setMensagemSucesso("");
    
    try {
      await apiFetch("/auth/resend-otp", {
        method: "POST", 
        body: JSON.stringify({ email: data.emailResend.trim() }) 
      });
      
      setMensagemSucesso("Nova senha temporária enviada para o seu e-mail.");
      setSenhaExpirada(false);
      resetResend();
    } catch (err) {
      setErroGeral(extrairErro(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[10000] animate-in fade-in duration-300">
      <div 
        onPointerDown={(e) => e.stopPropagation()} 
        className="bg-white w-[90%] max-w-[420px] p-8 rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-300"
      >
        <button 
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 p-1 rounded-full transition-all duration-200" 
          onClick={fecharModal}
          aria-label="Fechar"
        >
          <X size={20} />
        </button>
        
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-6 text-red-700 shadow-sm">
          <Unlock size={22} strokeWidth={2.5} />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Definir nova senha</h2>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">Por questões de segurança, crie uma senha definitiva para aceder à sua conta.</p>
        
        {erroGeral && (
          <div className="p-3.5 bg-red-50/80 text-red-700 border border-red-100 rounded-xl text-sm mb-6 flex items-start gap-2.5 animate-in slide-in-from-top-1">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span className="leading-relaxed font-medium">{erroGeral}</span>
          </div>
        )}

        {mensagemSucesso && (
          <div className="p-3.5 bg-green-50/80 text-green-700 border border-green-100 rounded-xl text-sm mb-6 flex items-start gap-2.5 animate-in slide-in-from-top-1">
            <span className="leading-relaxed font-medium">{mensagemSucesso}</span>
          </div>
        )}

        {senhaExpirada ? (
          <form autoComplete="off" onSubmit={handleSubmitResend(onSubmitResend)} className="flex flex-col gap-3">
            <p className="text-sm text-gray-600 mb-3 font-medium">Confirme o seu e-mail para receber um novo código:</p>
            <CustomInput name="emailResend" control={controlResend} label="E-mail registado" type="email" icon={Mail} required />

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-3 border-[1.5px] border-red-700 text-red-700 hover:bg-red-50 hover:shadow-sm rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} strokeWidth={2.5} />
              {loading ? "A processar..." : "Solicitar novo acesso"}
            </button>
          </form>
        ) : (
          <form autoComplete="off" onSubmit={handleSubmitSenha(onSubmitTrocaSenha)} className="flex flex-col gap-4">
            <CustomInput name="novaSenha" control={controlSenha} label="Nova Senha" isPassword showPassState={showNovaSenha} setShowPassState={setShowNovaSenha} required />
            <CustomInput name="confirmarNovaSenha" control={controlSenha} label="Confirmar Senha" isPassword showPassState={showConfirmNovaSenha} setShowPassState={setShowConfirmNovaSenha} required />
            
            <button 
              type="submit" 
              className="w-full py-3 bg-red-700 hover:bg-red-800 text-white shadow-md shadow-red-700/20 hover:shadow-lg hover:shadow-red-700/30 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed mt-4 flex items-center justify-center" 
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw size={16} className="animate-spin" />
                  <span>A guardar...</span>
                </div>
              ) : "Confirmar e aceder"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}