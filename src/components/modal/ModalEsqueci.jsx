import React, { useState, useEffect } from "react";
import { X, Mail, AlertCircle, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { apiFetch } from "../../services/api";

const FormInput = React.forwardRef(({ label, error, type = "text", allowOnlyNumbers, onChange, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const currentType = isPassword && !showPassword ? "password" : isPassword ? "text" : type;

  const handleChange = (e) => {
    if (allowOnlyNumbers) {
      e.target.value = e.target.value.replace(/\D/g, "");
    }
    if (onChange) {
      onChange(e);
    }
  };

  return (
    <div className="w-full mb-5 group">
      <label className="block text-xs font-semibold text-gray-500 tracking-wide mb-1.5 ml-1 transition-colors group-focus-within:text-gray-900">
        {label}
      </label>
      <div className="relative">
        <input
          ref={ref}
          type={currentType}
          onChange={handleChange}
          className={`w-full py-2.5 px-4 bg-transparent border rounded-xl text-sm text-gray-800 outline-none transition-all duration-300 ${
            error 
              ? "border-red-400 focus:border-red-500 bg-red-50/30" 
              : "border-gray-300 focus:border-gray-800 focus:shadow-sm"
          }`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition-colors"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
          </button>
        )}
      </div>
      {error && <span className="text-[11px] text-red-500 font-medium mt-1.5 ml-1 block animate-in fade-in">{error}</span>}
    </div>
  );
});

FormInput.displayName = "FormInput";

export default function ModalEsqueci() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [feedback, setFeedback] = useState({ type: "", message: "" });
  const [emailRecuperacao, setEmailRecuperacao] = useState("");

  useEffect(() => {
    const handleAbrirModal = () => setIsOpen(true);
    window.addEventListener('modal:esqueci', handleAbrirModal);
    return () => window.removeEventListener('modal:esqueci', handleAbrirModal);
  }, []);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const { 
    register: registerRecovery, 
    handleSubmit: submitRecovery, 
    reset: resetRecovery, 
    formState: { errors: errorsRecovery } 
  } = useForm({
    resolver: yupResolver(yup.object({
      email: yup.string().email("E-mail inválido").required("Informe seu e-mail")
    }))
  });

  const { 
    register: registerReset, 
    handleSubmit: submitReset, 
    reset: resetForm, 
    formState: { errors: errorsReset } 
  } = useForm({
    resolver: yupResolver(yup.object({
      codigoOtp: yup.string().required("Obrigatório").length(6, "Exatamente 6 dígitos"),
      novaSenha: yup.string().required("Obrigatória").min(6, "Mínimo de 6 caracteres"),
      confirmarNovaSenha: yup.string().oneOf([yup.ref('novaSenha')], "As senhas não coincidem").required("Obrigatória")
    }))
  });

  if (!isOpen) return null;

  const handleClose = () => {
    resetRecovery();
    resetForm();
    setStep(1);
    setFeedback({ type: "", message: "" });
    setEmailRecuperacao("");
    setIsOpen(false); 
  };

  const extrairErro = (err) => {
    if (err.backendErrors && err.backendErrors.length > 0) {
      return err.backendErrors.map(e => e.mensagem || e.defaultMessage).join(" | ");
    }
    return err.message || "Ocorreu um erro inesperado.";
  };

  const handleSendEmail = async (data) => {
    if (cooldown > 0) return;
    setLoading(true);
    setFeedback({ type: "", message: "" });
    
    try {
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: data.email.trim() })
      });
      
      setEmailRecuperacao(data.email.trim());
      setFeedback({ type: "success", message: "Código enviado para o seu e-mail!" });
      setCooldown(60);
      setStep(2);
    } catch (err) {
      setFeedback({ type: "error", message: extrairErro(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (data) => {
    setLoading(true);
    setFeedback({ type: "", message: "" });
    
    try {

      const payload = { 
        email: emailRecuperacao, 
        codigo0tp: data.codigoOtp, 
        novaSenha: data.novaSenha 
      };
      
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      
      setFeedback({ type: "success", message: "Palavra-passe redefinida com sucesso!" });
      setTimeout(handleClose, 2500);
    } catch (err) {
      setFeedback({ type: "error", message: extrairErro(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 transition-opacity animate-in fade-in duration-300">
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-[420px] p-8 rounded-2xl shadow-2xl relative animate-in zoom-in-95 duration-300"
      >
        <button 
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full" 
          onClick={handleClose}
          aria-label="Fechar"
        >
          <X size={18} strokeWidth={2} />
        </button>
        
        <div className="w-12 h-12 rounded-2xl bg-gray-900 flex items-center justify-center mb-6 text-white shadow-md">
          <Mail size={22} strokeWidth={1.5} />
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">Recuperar acesso</h2>
        
        <div className="transition-all duration-300">
          {step === 1 ? (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Esqueceu a sua palavra-passe? Não se preocupe. Informe o seu e-mail para receber um código de recuperação.
              </p>
              
              {feedback.message && feedback.type === "error" && (
                <div className="p-3.5 bg-red-50/80 text-red-700 border border-red-100 rounded-xl text-sm mb-6 flex items-start gap-2.5 animate-in slide-in-from-top-1">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span className="leading-relaxed font-medium">{feedback.message}</span>
                </div>
              )}

              <form autoComplete="off" onSubmit={submitRecovery(handleSendEmail)}>
                <FormInput 
                  label="Endereço de E-mail" 
                  type="email" 
                  placeholder="exemplo@email.com"
                  error={errorsRecovery.email?.message}
                  {...registerRecovery("email")} 
                />
                
                <button 
                  type="submit" 
                  className="w-full py-3 mt-2 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-2" 
                  disabled={loading || cooldown > 0}
                >
                  {loading ? "A processar..." : cooldown > 0 ? `Aguarde ${cooldown}s` : "Receber Código"}
                </button>
              </form>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Digite o código de 6 dígitos que enviámos para <strong className="text-gray-900">{emailRecuperacao}</strong>.
              </p>
              
              {feedback.message && (
                <div className={`p-3.5 rounded-xl text-sm mb-6 flex items-start gap-2.5 border animate-in slide-in-from-top-1 ${
                  feedback.type === "success" ? "bg-green-50/80 text-green-700 border-green-100" : "bg-red-50/80 text-red-700 border-red-100"
                }`}>
                  {feedback.type === "success" ? <CheckCircle size={18} className="mt-0.5 shrink-0"/> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
                  <span className="leading-relaxed font-medium">{feedback.message}</span>
                </div>
              )}

              <form autoComplete="off" onSubmit={submitReset(handleResetPassword)}>
                <FormInput 
                  label="Código de Autenticação" 
                  maxLength={6} 
                  inputMode="numeric" 
                  autoComplete="one-time-code"
                  placeholder="000000"
                  allowOnlyNumbers
                  error={errorsReset.codigoOtp?.message}
                  {...registerReset("codigoOtp")} 
                />
                
                <FormInput 
                  label="Nova Palavra-passe" 
                  type="password" 
                  placeholder="Mínimo de 6 caracteres"
                  error={errorsReset.novaSenha?.message}
                  {...registerReset("novaSenha")} 
                />
                
                <FormInput 
                  label="Confirmar Palavra-passe" 
                  type="password" 
                  placeholder="Repita a nova senha"
                  error={errorsReset.confirmarNovaSenha?.message}
                  {...registerReset("confirmarNovaSenha")} 
                />
                
                <button 
                  type="submit" 
                  className="w-full py-3 mt-2 bg-gray-900 hover:bg-black text-white rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed shadow-md hover:shadow-lg flex items-center justify-center gap-2" 
                  disabled={loading}
                >
                  {loading ? "A Guardar..." : "Redefinir Senha"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}