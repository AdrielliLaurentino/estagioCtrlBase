import React, { useState, useEffect, useRef } from "react";
import { X, ShieldCheck, AlertCircle, CheckCircle } from "lucide-react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const API_BASE = "/api/auth";

const FormInput = React.forwardRef(({ label, error, type = "text", allowOnlyNumbers, onChange, ...props }, ref) => {
  const handleChange = (e) => {
    if (allowOnlyNumbers) {
      e.target.value = e.target.value.replace(/\D/g, "");
    }
    if (onChange) onChange(e);
  };

  return (
    <div className="w-full mb-6">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
        {label}
      </label>
      <input
        ref={ref}
        type={type}
        onChange={handleChange}
        className={`w-full py-3.5 px-4 bg-gray-50/50 border-2 rounded-xl text-sm text-gray-900 outline-none transition-all duration-200 ${
          error 
            ? "border-red-400 focus:border-red-500 focus:bg-white bg-red-50/20" 
            : "border-gray-100 hover:border-gray-200 focus:border-red-700 focus:bg-white"
        }`}
        {...props}
      />
      {error && <span className="text-[11px] text-red-500 font-bold mt-1.5 ml-1 block">{error}</span>}
    </div>
  );
});
FormInput.displayName = "FormInput";

const OtpInput = ({ value, onChange, error }) => {
  const length = 6;
  const valString = typeof value === "string" ? value : "";
  const inputsRefs = useRef([]);

  const handleInput = (e, index) => {
    let char = e.target.value.replace(/\D/g, "");
    
    if (char.length > 1) {
        char = char.substring(0, length);
        onChange(char);
        const focusIndex = char.length === length ? length - 1 : char.length;
        inputsRefs.current[focusIndex]?.focus();
        return;
    }

    const newArr = valString.split("");
    newArr[index] = char.slice(-1); 
    const newVal = newArr.join("");
    onChange(newVal);

    if (char && index < length - 1) {
        inputsRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === "Backspace" && !valString[index] && index > 0) {
        inputsRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (pasted) {
        onChange(pasted);
        const focusIndex = pasted.length === length ? length - 1 : pasted.length;
        inputsRefs.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="w-full mb-8">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 text-center">
        Código de 6 dígitos
      </label>
      <div className="flex items-center justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => (inputsRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={valString[i] || ""}
            onChange={(e) => handleInput(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            autoComplete="one-time-code"
            className={`w-full h-14 sm:h-16 text-center text-2xl font-extrabold rounded-xl outline-none transition-all duration-200 border-2 ${
              error
                ? "border-red-400 focus:border-red-600 bg-red-50/20 text-red-700"
                : "border-gray-100 bg-gray-50/50 hover:border-gray-200 focus:border-red-700 focus:bg-white text-gray-900"
            }`}
          />
        ))}
      </div>
      {error && <span className="text-[11px] text-red-500 font-bold mt-2 text-center block">{error}</span>}
    </div>
  );
};

const ativacaoSchema = yup.object({
  email: yup.string().email("E-mail inválido").required("Informe o e-mail cadastrado"),
  codigo: yup.string().required("Obrigatório").length(6, "Digite os 6 dígitos")
});

export default function ModalAtivacao() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm({
    resolver: yupResolver(ativacaoSchema)
  });

  useEffect(() => {
    const handleAbrirModal = (event) => {
      setIsOpen(true);
      setFeedback({ type: "", message: "" });
      
      if (event.detail && event.detail.email) {
        setValue("email", event.detail.email);
      }
    };
    
    window.addEventListener('modal:ativacao', handleAbrirModal);
    return () => window.removeEventListener('modal:ativacao', handleAbrirModal);
  }, [setValue]);

  if (!isOpen) return null;

  const handleClose = () => {
    reset();
    setFeedback({ type: "", message: "" });
    setIsOpen(false); 
  };

  const tratarErroFetch = async (response) => {
    try {
      const errData = await response.json();
      return errData.message || errData.errors?.[0]?.mensagem || "Código inválido ou expirado.";
    } catch {
      return "Erro de comunicação com o servidor.";
    }
  };

  const onActivate = async (data) => {
    setLoading(true);
    setFeedback({ type: "", message: "" });
    
    try {
      const res = await fetch(`${API_BASE}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email, codigoOtp: data.codigo })
      });
      
      if (!res.ok) throw new Error(await tratarErroFetch(res));
      
      setFeedback({ type: "success", message: "Conta ativada com sucesso! Redirecionando..." });
      
      setTimeout(() => {
        handleClose();
      }, 2000);

    } catch (err) {
      setFeedback({ type: "error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[10000] p-4 transition-opacity">
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-md p-10 rounded-[2rem] shadow-2xl relative animate-in fade-in zoom-in-95 duration-300"
      >
        <button 
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full outline-none" 
          onClick={handleClose}
          aria-label="Fechar"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
        
        <div className="w-16 h-16 rounded-2xl bg-red-50/80 flex items-center justify-center mb-6 text-red-700 shadow-sm border border-red-100">
          <ShieldCheck size={32} strokeWidth={1.5} />
        </div>
        
        <h2 className="text-2xl font-extrabold text-gray-900 mb-2 tracking-tight">Ativar Conta</h2>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed font-medium">
          Enviámos um código para o seu e-mail. Confirme abaixo para liberar o seu acesso.
        </p>
        
        {feedback.message && (
          <div className={`p-4 rounded-2xl text-sm mb-8 flex items-start gap-3 border ${
            feedback.type === "success" ? "bg-green-50 text-green-800 border-green-200" : "bg-red-50 text-red-800 border-red-200"
          }`}>
            {feedback.type === "success" ? <CheckCircle size={18} className="mt-0.5 shrink-0"/> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
            <span className="font-semibold">{feedback.message}</span>
          </div>
        )}

        <form autoComplete="off" onSubmit={handleSubmit(onActivate)}>
          <FormInput 
            label="Endereço de E-mail" 
            type="email" 
            placeholder="exemplo@email.com"
            error={errors.email?.message}
            {...register("email")} 
          />

          <Controller
            name="codigo"
            control={control}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <OtpInput value={value} onChange={onChange} error={error?.message} />
            )}
          />
          
          <button 
            type="submit" 
            className="w-full py-4 mt-2 bg-red-700 hover:bg-red-800 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-red-700/20 active:scale-[0.98] flex items-center justify-center gap-2" 
            disabled={loading}
          >
            {loading ? "A Ativar..." : "Confirmar Ativação"}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button" 
            className="text-xs font-bold text-gray-400 hover:text-red-700 transition-colors uppercase tracking-wider outline-none"
          >
            Não recebeu o código?
          </button>
        </div>
      </div>
    </div>
  );
}