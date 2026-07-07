import React, { useState, useEffect } from "react";
import { Loader2, Info, ArrowLeft, Target, Award } from "lucide-react";
import ModalLateral from "../common/ModalLateral"; 
import apiFetch from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function CadastroTarefa({ isOpen, onClose, onSucesso }) {
  const { user } = useAuth();
  
  const idUnidadeAtual = user?.idUnidadeSessao || user?.idUnidade || user?.unidadeId;
  const cargoUsuario = user?.cargo?.toUpperCase() || "";
  const [loading, setLoading] = useState(false);
  const [erros, setErros] = useState([]);
  const [erroGlobal, setErroGlobal] = useState(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [pontosRecompensa, setPontosRecompensa] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNome("");
      setDescricao("");
      setPontosRecompensa("");
      setErros([]);
      setErroGlobal(null);
    }
  }, [isOpen]);

  const handleSalvar = async (e, fecharModalComAnimacao) => {
    e.preventDefault();
    setErroGlobal(null);
    const camposComErro = [];

    if (!nome.trim()) camposComErro.push("nome");
    
    const pontosNum = Number(pontosRecompensa);
    if (!pontosRecompensa || isNaN(pontosNum) || pontosNum <= 0) camposComErro.push("pontosRecompensa");

    if (camposComErro.length > 0) {
      setErros(camposComErro);
      setErroGlobal("Preencha os campos em destaque.");
      setTimeout(() => setErros([]), 3000);
      return;
    }

    if (!idUnidadeAtual) return alert("Sessão inválida: Unidade não identificada.");

    if (!["DONO", "GERENTE", "ADMIN"].includes(cargoUsuario)) {
      setErroGlobal("Acesso Negado: Apenas gestores podem criar moldes de tarefas.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        idUnidade: Number(idUnidadeAtual),
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        pontosRecompensa: pontosNum
      };
      await apiFetch("/gamificacao/templates", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (onSucesso) onSucesso();
      fecharModalComAnimacao();

    } catch (err) {
      const msgs = err.errors ? err.errors.map(e => e.defaultMessage).join(" | ") : 
                   err.backendErrors ? err.backendErrors.map(e => e.mensagem).join(" | ") : 
                   err.message || "Erro desconhecido ao cadastrar a tarefa.";
      setErroGlobal(`Ação recusada: ${msgs}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* Mantendo as animações do seu padrão de design */
        input:-webkit-autofill { transition: background-color 5000s ease-in-out 0s; -webkit-text-fill-color: white !important; }
        @keyframes shake-error { 0%, 100% { transform: translateX(0); } 25%, 75% { transform: translateX(-4px); } 50% { transform: translateX(4px); } }
        .shake-error { animation: shake-error 0.3s ease-in-out; border-color: #f97316 !important; }
      `}</style>

      <ModalLateral 
        isOpen={isOpen} 
        onClose={onClose} 
        titulo={<span className="text-white font-black uppercase italic tracking-tight">Nova Tarefa</span>} 
        subtitulo={<span className="text-white/60 font-bold uppercase tracking-widest text-[9px]">Molde de Gamificação</span>} 
        icone={
          <div className="relative w-full h-full flex items-center justify-center text-white">
            <Target size={36} className="opacity-90 stroke-[1.5]" />
          </div>
        } 
        footer={(fecharModal) => (
          <div className="flex w-full">
            <button type="button" onClick={fecharModal} className="flex-1 py-8 flex justify-center items-center opacity-80 hover:opacity-100 transition-all group outline-none relative bg-black/10 hover:bg-black/20">
                <ArrowLeft size={18} className="absolute left-8 text-white opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                <span className="font-black uppercase text-[13px] tracking-widest text-white">Cancelar</span>
            </button>
            <button type="submit" form="form-tarefa" disabled={loading} onClick={(e) => handleSalvar(e, fecharModal)} className="flex-1 py-8 flex justify-center items-center gap-2 disabled:opacity-30 bg-white/10 hover:bg-white/20 transition-all outline-none group border-l border-white/10">
                {loading && <Loader2 size={16} className="animate-spin text-white" />} 
                <span className="font-black uppercase text-[13px] tracking-widest text-white">Confirmar</span>
            </button>
          </div>
        )}
      >
        <div className="flex flex-col gap-6 pb-6 text-white min-h-[400px]">
          
          {erroGlobal && (
             <div className="flex items-start gap-3 py-3 px-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 transition-all animate-in slide-in-from-top-2">
                <Info size={16} className="shrink-0 mt-0.5" />
                <span className="text-xs font-semibold tracking-wide leading-relaxed">{erroGlobal}</span>
             </div>
          )}

          <form id="form-tarefa" className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500 mt-2">
            
            <div className="flex flex-col gap-6">
              {/* Reaproveitando os seus componentes de input estáticos na base do arquivo */}
              <Input 
                id="nome" label="Nome da Tarefa *" placeholder="Ex: Limpeza dos equipamentos"
                value={nome} onChange={setNome} hasError={erros.includes("nome")} 
              />
              <Input 
                id="descricao" label="Descrição (Opcional)" placeholder="Instruções adicionais..."
                value={descricao} onChange={setDescricao} hasError={erros.includes("descricao")} 
              />
            </div>

            <div className="grid grid-cols-1 gap-6 p-5 rounded-2xl bg-white/5 border border-white/10">
                <InputNumerico 
                  id="pontosRecompensa" label="Pontos de Recompensa *" icone={<Award size={14} className="text-white/60" />} placeholder="Ex: 50"
                  value={pontosRecompensa} onChange={setPontosRecompensa} hasError={erros.includes("pontosRecompensa")} 
                />
            </div>

            <div className="flex flex-col gap-3 mt-4">
               <span className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Como funciona?</span>
               <p className="text-[10px] font-semibold text-white/50 leading-relaxed uppercase tracking-widest">
                 Ao criar este molde, você poderá agendar essa tarefa diariamente para os funcionários. Quando concluída, o sistema creditará os pontos automaticamente.
               </p>
            </div>
            
          </form>
        </div>
      </ModalLateral>
    </>
  );
}

function Input({ id, label, value, onChange, placeholder = "", disabled = false, hasError = false }) {
  const safeValue = value ?? "";
  const [isFocused, setIsFocused] = useState(false);
  const active = isFocused || (safeValue.toString().length > 0);

  return (
    <div className={`relative w-full border-b transition-colors ${disabled ? 'border-white/10 opacity-30 cursor-not-allowed' : hasError ? 'shake-error border-orange-500 opacity-100' : 'border-white/20 focus-within:border-white/80 hover:border-white/60 opacity-100'}`}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? 'text-orange-500' : 'text-white'} ${active ? "-top-5 text-[9px] opacity-100" : "top-1 text-xs opacity-70"}`}>
        {label}
      </label>
      <input 
        id={id} type="text" value={safeValue} disabled={disabled} placeholder={isFocused ? placeholder : ""}
        onFocus={() => !disabled && setIsFocused(true)} 
        onBlur={() => !disabled && setIsFocused(false)} 
        onChange={(e) => !disabled && onChange(e.target.value)} 
        className={`w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 ${hasError ? 'text-orange-400' : 'text-white'} placeholder-white/40`} 
      />
    </div>
  );
}

function InputNumerico({ id, label, value, onChange, placeholder = "", icone, hasError = false }) {
  const safeValue = value ?? "";
  const [isFocused, setIsFocused] = useState(false);
  const active = isFocused || (safeValue.toString().length > 0);

  const handleMask = (e) => {
    const val = e.target.value.replace(/\D/g, "");
    onChange(val);
  };

  return (
    <div className={`relative w-full border-b transition-colors ${hasError ? 'shake-error border-orange-500 opacity-100' : 'border-white/20 focus-within:border-white/80 hover:border-white/60 opacity-100'}`}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? 'text-orange-500' : 'text-white'} ${active ? "-top-5 text-[9px] opacity-100" : "top-1 text-xs opacity-70"}`}>
        {label}
      </label>
      <div className="relative flex items-center">
        <input 
          id={id} type="text" inputMode="numeric" value={safeValue} placeholder={isFocused ? placeholder : ""}
          onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={handleMask} 
          className={`w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 pr-6 ${hasError ? 'text-orange-400' : 'text-white'} placeholder-white/40`} 
        />
        {icone && <div className="absolute right-0 top-1.5 pointer-events-none">{icone}</div>}
      </div>
    </div>
  );
}