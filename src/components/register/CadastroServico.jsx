import React, { useState, useEffect } from "react";
import { Loader2, Info, ArrowLeft, Briefcase, Clock, Users, CalendarRange } from "lucide-react";
import ModalLateral from "../common/ModalLateral";
import apiFetch from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export default function CadastroServico({ isOpen, onClose, onSucesso }) {
  const { user } = useAuth();
  const idUnidadeAtual = user?.idUnidadeSessao || user?.idUnidade || user?.unidadeId;
  const cargoUsuario = user?.cargo?.toUpperCase() || "";
  const [loading, setLoading] = useState(false);
  const [erros, setErros] = useState([]);
  const [erroGlobal, setErroGlobal] = useState(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [precoBase, setPrecoBase] = useState("");
  const [duracaoMinutos, setDuracaoMinutos] = useState("");
  const [limiteVagas, setLimiteVagas] = useState("1");
  const [diasCarencia, setDiasCarencia] = useState("30");

  useEffect(() => {
    if (isOpen) {
      setNome("");
      setDescricao("");
      setPrecoBase("");
      setDuracaoMinutos("");
      setLimiteVagas("1");
      setDiasCarencia("30");
      setErros([]);
      setErroGlobal(null);
    }
  }, [isOpen]);
  const parseMoedaParaFloat = (valorString) => {
    if (!valorString) return 0;
    return parseFloat(valorString.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const handleSalvar = async (e, fecharModalComAnimacao) => {
    e.preventDefault();
    setErroGlobal(null);
    const camposComErro = [];
    if (!nome.trim()) camposComErro.push("nome");
    if (!precoBase) camposComErro.push("precoBase");
    
    const duracaoNum = Number(duracaoMinutos);
    if (!duracaoMinutos || isNaN(duracaoNum) || duracaoNum <= 0) camposComErro.push("duracaoMinutos");

    const vagasNum = Number(limiteVagas);
    if (isNaN(vagasNum) || vagasNum <= 0) camposComErro.push("limiteVagas");

    const carenciaNum = Number(diasCarencia);
    if (isNaN(carenciaNum) || carenciaNum < 0) camposComErro.push("diasCarencia");

    if (camposComErro.length > 0) {
      setErros(camposComErro);
      setErroGlobal("Preencha os campos em destaque.");
      setTimeout(() => setErros([]), 3000);
      return;
    }

    if (!idUnidadeAtual) return alert("Sessão inválida: Unidade não identificada.");

    if (!["DONO", "GERENTE", "ADMIN"].includes(cargoUsuario)) {
      setErroGlobal("Acesso Negado: Apenas gestores podem criar serviços.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        idUnidade: Number(idUnidadeAtual),
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        precoBase: parseMoedaParaFloat(precoBase),
        duracaoMinutos: duracaoNum,
        limiteVagasSimultaneas: vagasNum,
        diasCarenciaRetorno: carenciaNum,
        ativo: true
      };

      await apiFetch("/servicos", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (onSucesso) onSucesso();
      fecharModalComAnimacao();

    } catch (err) {
      const msgs = err.errors ? err.errors.map(e => e.defaultMessage).join(" | ") : 
                   err.backendErrors ? err.backendErrors.map(e => e.mensagem).join(" | ") : 
                   err.message || "Erro desconhecido ao cadastrar o serviço.";
      setErroGlobal(`Ação recusada: ${msgs}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        input:-webkit-autofill { transition: background-color 5000s ease-in-out 0s; -webkit-text-fill-color: white !important; }
        @keyframes shake-error { 0%, 100% { transform: translateX(0); } 25%, 75% { transform: translateX(-4px); } 50% { transform: translateX(4px); } }
        .shake-error { animation: shake-error 0.3s ease-in-out; border-color: #f97316 !important; }
      `}</style>

      <ModalLateral 
        isOpen={isOpen} 
        onClose={onClose} 
        titulo={<span className="text-white font-black uppercase italic tracking-tight">Novo Serviço</span>} 
        subtitulo={<span className="text-white/60 font-bold uppercase tracking-widest text-[9px]">Configuração de Atendimento</span>} 
        icone={
          <div className="relative w-full h-full flex items-center justify-center text-white">
            <Briefcase size={36} className="opacity-90 stroke-[1.5]" />
          </div>
        } 
        footer={(fecharModal) => (
          <div className="flex w-full">
            <button type="button" onClick={fecharModal} className="flex-1 py-8 flex justify-center items-center opacity-80 hover:opacity-100 transition-all group outline-none relative bg-black/10 hover:bg-black/20">
                <ArrowLeft size={18} className="absolute left-8 text-white opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                <span className="font-black uppercase text-[13px] tracking-widest text-white">Cancelar</span>
            </button>
            <button type="submit" form="form-servico" disabled={loading} onClick={(e) => handleSalvar(e, fecharModal)} className="flex-1 py-8 flex justify-center items-center gap-2 disabled:opacity-30 bg-white/10 hover:bg-white/20 transition-all outline-none group border-l border-white/10">
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

          <form id="form-servico" className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500 mt-2">
            
            <div className="flex flex-col gap-6">
              <Input 
                id="nome" label="Nome do Serviço *" placeholder="Ex: Avaliação de Bioimpedância"
                value={nome} onChange={setNome} hasError={erros.includes("nome")} 
              />
              <Input 
                id="descricao" label="Descrição (Opcional)" placeholder="Detalhes que o cliente verá..."
                value={descricao} onChange={setDescricao} hasError={erros.includes("descricao")} 
              />
            </div>

            <div className="grid grid-cols-2 gap-6 p-5 rounded-2xl bg-white/5 border border-white/10">
                <InputMoeda 
                  id="precoBase" label="Preço Base (R$) *" 
                  value={precoBase} onChange={setPrecoBase} hasError={erros.includes("precoBase")} 
                />
                <InputNumerico 
                  id="duracaoMinutos" label="Duração (Minutos) *" icone={<Clock size={14} className="text-white/60" />} placeholder="Ex: 60"
                  value={duracaoMinutos} onChange={setDuracaoMinutos} hasError={erros.includes("duracaoMinutos")} 
                />
            </div>

            <div className="flex flex-col gap-3">
               <span className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-1">Regras Operacionais</span>
               <div className="grid grid-cols-2 gap-6">
                  <InputNumerico 
                    id="limiteVagas" label="Vagas por horário *" icone={<Users size={14} className="text-white/60" />} 
                    value={limiteVagas} onChange={setLimiteVagas} hasError={erros.includes("limiteVagas")} 
                  />
                  <InputNumerico 
                    id="diasCarencia" label="Carência (Dias) *" icone={<CalendarRange size={14} className="text-white/60" />} 
                    value={diasCarencia} onChange={setDiasCarencia} hasError={erros.includes("diasCarencia")} 
                  />
               </div>
               <p className="text-[10px] font-semibold text-white/50 leading-relaxed mt-2 uppercase tracking-widest">
                 O limite de vagas define quantos clientes podem ser agendados no mesmo horário. A carência bloqueia agendamentos gratuitos repetidos.
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

function InputMoeda({ id, label, value, onChange, hasError = false }) {
  const safeValue = value ?? "";
  const [isFocused, setIsFocused] = useState(false);
  const active = isFocused || (safeValue.toString().length > 0);

  const handleMaskMoeda = (e) => {
    let limpo = e.target.value.replace(/\D/g, "");
    if (limpo.length === 0) {
      onChange("");
      return;
    }
    let formatado = (parseInt(limpo, 10) / 100).toFixed(2);
    formatado = formatado.replace(".", ",");
    formatado = formatado.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    onChange(formatado);
  };

  return (
    <div className={`relative w-full border-b transition-colors ${hasError ? 'shake-error border-orange-500 opacity-100' : 'border-white/20 focus-within:border-white/80 hover:border-white/60 opacity-100'}`}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? 'text-orange-500' : 'text-white'} ${active ? "-top-5 text-[9px] opacity-100" : "top-1 text-xs opacity-70"}`}>
        {label}
      </label>
      <div className="relative flex items-center">
        {active && <span className="text-sm font-bold text-white/50 mr-1 mt-[-4px]">R$</span>}
        <input 
          id={id} type="text" inputMode="numeric" value={safeValue} placeholder={isFocused ? "0,00" : ""}
          onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={handleMaskMoeda} 
          className={`w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 ${hasError ? 'text-orange-400' : 'text-white'} placeholder-white/40`} 
        />
      </div>
    </div>
  );
}