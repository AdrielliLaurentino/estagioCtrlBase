import React, { useState, useEffect } from "react";
import { Ticket, Loader2, ChevronDown, Calendar, Type, ChevronUp } from "lucide-react";
import ModalLateral from "../common/ModalLateral";
import { apiFetch } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const valoresIniciais = {
  codigo: "",
  tipo: "PERCENTUAL",
  valor: "",
  quantidadeDisponivel: "",
  validadeFim: "",
  acumulativo: false
};

const formatarDataParaVisual = (dataVal) => {
  if (!dataVal) return "";
  if (Array.isArray(dataVal)) {
    const [y, m, d] = dataVal;
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }
  const str = String(dataVal);
  const datePart = str.includes("T") ? str.split("T")[0] : str;
  const partes = datePart.split(/[-/]/);
  if (partes.length !== 3) return str;
  if (partes[0].length === 4) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  return `${partes[0]}/${partes[1]}/${partes[2]}`;
};

export default function CadastroCupom({ onClose, dadosIniciais, onSalvo, isOpen = false }) {
  const { user } = useAuth();
  const idOperadorSessao = user?.id || user?.idFuncionario;
  const [form, setForm] = useState(valoresIniciais);
  const [loading, setLoading] = useState(false);
  const [erros, setErros] = useState([]);
  const isEdicao = !!dadosIniciais;

  useEffect(() => {
    if (isOpen) {
      setErros([]);
      if (dadosIniciais) {
        setForm({
          ...valoresIniciais,
          ...dadosIniciais,
          validadeFim: formatarDataParaVisual(dadosIniciais.validadeFim),
          acumulativo: dadosIniciais.acumulativo || false
        });
      } else {
        setForm(valoresIniciais);
      }
    }
  }, [isOpen, dadosIniciais]);

  const construirPayload = () => {
    let dataFormatadaBackend = null;
    if (form.validadeFim && form.validadeFim.includes("/")) {
      const [dia, mes, ano] = form.validadeFim.split("/");
      dataFormatadaBackend = `${ano}-${mes}-${dia}T23:59:59`;
    } else if (form.validadeFim) {
        const datePart = form.validadeFim.includes("T") ? form.validadeFim.split("T")[0] : form.validadeFim;
        dataFormatadaBackend = `${datePart}T23:59:59`;
    }

    return {
      idFuncionarioCriador: Number(idOperadorSessao),
      codigo: form.codigo.toUpperCase().trim(),
      tipo: form.tipo,
      valor: Number(form.valor),
      quantidadeDisponivel: Number(form.quantidadeDisponivel),
      validadeFim: dataFormatadaBackend,
      acumulativo: form.acumulativo === true || form.acumulativo === "true"
    };
  };

  const handleSalvar = async (e, fecharModalComAnimacao) => {
    e.preventDefault();
    
    if (!idOperadorSessao) {
      alert("Erro de Sessão: Não foi possível identificar o operador atual. Faça login novamente.");
      return;
    }

    const camposComErro = [];
    if (!form.codigo || form.codigo.trim() === "") camposComErro.push("codigo");
    if (!form.valor || Number(form.valor) <= 0) camposComErro.push("valor");
    if (!form.quantidadeDisponivel || Number(form.quantidadeDisponivel) < 1) camposComErro.push("quantidadeDisponivel");
    if (!form.validadeFim || form.validadeFim.trim() === "") camposComErro.push("validadeFim");

    if (camposComErro.length > 0) {
      setErros(camposComErro);
      setTimeout(() => setErros([]), 3000);
      return;
    }

    setLoading(true);
    try {
      const url = isEdicao ? `/vouchers/${form.idVoucher || form.id}` : "/vouchers";
      const method = isEdicao ? "PUT" : "POST";
      
      const payload = construirPayload();

      await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      if (onSalvo) onSalvo();
      fecharModalComAnimacao();

    } catch (err) {
      if (err.backendErrors && err.backendErrors.length > 0) {
         const mensagens = err.backendErrors.map(e => `• ${e.campo}: ${e.mensagem}`).join("\n");
         alert(`Corrija os seguintes campos:\n\n${mensagens}`);
         setErros(err.backendErrors.map(e => e.campo));
      } else {
         alert(err.message || "Erro ao salvar voucher.");
      }
      setTimeout(() => setErros([]), 4000);
    } finally {
      setLoading(false);
    }
  };

  const iconeTicket = (
    <div className="relative w-full h-full flex items-center justify-center !text-white">
       <Ticket size={40} className="opacity-80 drop-shadow-md" />
    </div>
  );

  const renderFooter = (fecharModalComAnimacao) => (
    <>
      <button type="button" onClick={fecharModalComAnimacao} className="flex-1 py-8 flex justify-center items-center opacity-70 hover:opacity-100 transition-all group outline-none">
          <span className="font-black uppercase text-sm group-hover:text-base transition-all duration-300 tracking-widest !text-white">Descartar</span>
      </button>
      <button type="submit" form="form-cupom" disabled={loading} onClick={(e) => handleSalvar(e, fecharModalComAnimacao)} className="flex-1 py-8 flex justify-center items-center gap-2 transition-all disabled:opacity-30 outline-none group">
          {loading && <Loader2 size={18} className="animate-spin !text-white" />} 
          <span className="font-black uppercase text-sm group-hover:text-base transition-all duration-300 tracking-widest !text-white">{isEdicao ? "Salvar" : "Ativar Voucher"}</span>
      </button>
    </>
  );

  const opcoesTipo = [
    { value: "PERCENTUAL", label: "Percentual (%)" },
    { value: "FIXO", label: "Valor Fixo (R$)" }
  ];

  const opcoesAcumulativo = [
    { value: false, label: "Não (Padrão)" },
    { value: true, label: "Sim, acumular com outros descontos" }
  ];

  return (
    <>
      <style>{`
        input:-webkit-autofill { transition: background-color 5000s ease-in-out 0s; -webkit-text-fill-color: white !important; }
        @keyframes shake-error { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px); } 50% { transform: translateX(4px); } 75% { transform: translateX(-4px); } }
        .shake-error { animation: shake-error 0.3s ease-in-out; border-color: #f97316 !important; }
        ::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; opacity: 0.6; }
      `}</style>

      <ModalLateral 
        isOpen={isOpen} 
        onClose={onClose}
        titulo={<span className="!text-white font-black uppercase italic tracking-tight">{isEdicao ? "Editar Voucher" : "Novo Voucher"}</span>}
        subtitulo={<span className="!text-white opacity-80 font-bold uppercase tracking-widest text-[9px]">Crie regras de desconto para o PDV</span>}
        icone={iconeTicket}
        footer={renderFooter}
      >
        <div className="flex flex-col gap-10 pb-6 !text-white">
          <form id="form-cupom" onSubmit={(e) => e.preventDefault()} autoComplete="off" className="flex flex-col gap-10 mt-2">
            
            <Input 
              id="codigo" 
              label="Código Promocional *" 
              value={form.codigo} 
              onChange={(v) => setForm({...form, codigo: v.toUpperCase().replace(/[^A-Z0-9]/g, '')})} 
              hasError={erros.includes("codigo")}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <Select 
                id="tipo" 
                label="Tipo de Desconto *"
                value={form.tipo}
                options={opcoesTipo}
                onChange={(v) => setForm({...form, tipo: v})}
              />

              <InputNumber 
                id="valor"
                label={form.tipo === 'PERCENTUAL' ? "Desconto (%) *" : "Desconto (R$) *"} 
                step={form.tipo === 'PERCENTUAL' ? "1" : "0.50"}
                value={form.valor} 
                onChange={(v) => setForm({...form, valor: v})} 
                hasError={erros.includes("valor")}
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
              <InputNumber 
                id="quantidadeDisponivel"
                label="Limite de Usos *" 
                step="1"
                value={form.quantidadeDisponivel} 
                onChange={(v) => setForm({...form, quantidadeDisponivel: v})}
                hasError={erros.includes("quantidadeDisponivel")} 
              />

              <InputData 
                id="validadeFim"
                label="Data de Validade *" 
                value={form.validadeFim} 
                onChange={(v) => setForm({...form, validadeFim: v})} 
                hasError={erros.includes("validadeFim")}
              />
            </div>

            <Select 
              id="acumulativo" 
              label="É Acumulativo? *"
              value={form.acumulativo}
              options={opcoesAcumulativo}
              onChange={(v) => setForm({...form, acumulativo: v})}
            />

          </form>
        </div>
      </ModalLateral>
    </>
  );
}

function Input({ id, label, value, onChange, type = "text", disabled = false, hasError = false }) {
  const safeValue = value ?? "";
  const [isFocused, setIsFocused] = useState(false);
  const active = isFocused || (safeValue.toString().length > 0);

  return (
    <div className={`relative w-full border-b transition-all ${disabled ? '!border-white/30 opacity-40 cursor-not-allowed border-dashed' : hasError ? 'shake-error !border-orange-500 opacity-100' : '!border-white/40 focus-within:!border-white opacity-80 hover:opacity-100'}`}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? '!text-orange-500' : '!text-white'} ${active ? "-top-5 text-[10px] opacity-100" : "top-1 text-sm opacity-80"}`}>{label}</label>
      <input type={type} value={safeValue} onFocus={() => !disabled && setIsFocused(true)} onBlur={() => !disabled && setIsFocused(false)} onChange={(e) => !disabled && onChange(e.target.value)} disabled={disabled} className={`w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 ${hasError ? '!text-orange-500' : '!text-white'} placeholder-white/40`} />
    </div>
  );
}

function InputNumber({ id, label, value, onChange, step = "1", disabled = false, hasError = false }) {
  const safeValue = value ?? "";
  const [isFocused, setIsFocused] = useState(false);
  const active = isFocused || (safeValue.toString().length > 0);
  const stepValue = parseFloat(step);
  const decimais = stepValue < 1 ? 2 : 0;

  const handleIncrement = () => {
    if (disabled) return;
    const atual = parseFloat(safeValue) || 0;
    const novo = (atual + stepValue).toFixed(decimais);
    onChange(novo.toString());
  };

  const handleDecrement = () => {
    if (disabled) return;
    const atual = parseFloat(safeValue) || 0;
    let novo = (atual - stepValue).toFixed(decimais);
    if (parseFloat(novo) < 0) novo = (0).toFixed(decimais);
    onChange(novo.toString());
  };

  return (
    <div className={`relative w-full border-b transition-all group ${disabled ? '!border-white/30 opacity-40 cursor-not-allowed border-dashed' : hasError ? 'shake-error !border-orange-500 opacity-100' : '!border-white/40 focus-within:!border-white opacity-80 hover:opacity-100'}`}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? '!text-orange-500' : '!text-white'} ${active ? "-top-5 text-[10px] opacity-100" : "top-1 text-sm opacity-80"}`}>{label}</label>
      <div className="relative flex items-center">
        <input 
          type="number" 
          step={step}
          value={safeValue} 
          onFocus={() => !disabled && setIsFocused(true)} 
          onBlur={() => !disabled && setIsFocused(false)} 
          onChange={(e) => !disabled && onChange(e.target.value)} 
          disabled={disabled}
          className={`w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 ${hasError ? '!text-orange-500' : '!text-white'} placeholder-white/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none pr-8 ${disabled ? 'cursor-not-allowed' : ''}`} 
        />
        
        {!disabled && (
          <div className="absolute right-0 top-0 bottom-2 flex flex-col justify-center items-center gap-0.5">
            <button type="button" onClick={handleIncrement} className="opacity-40 hover:opacity-100 hover:scale-110 transition-all outline-none">
              <ChevronUp size={14} strokeWidth={3} className="!text-white" />
            </button>
            <button type="button" onClick={handleDecrement} className="opacity-40 hover:opacity-100 hover:scale-110 transition-all outline-none">
              <ChevronDown size={14} strokeWidth={3} className="!text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function InputData({ id, label, value, onChange, hasError }) {
  const safeValue = value || "";
  const [isFocused, setIsFocused] = useState(false);
  const [usarCalendario, setUsarCalendario] = useState(false); 
  const active = isFocused || safeValue.length > 0;
  const handleTextChange = (e) => {
    let v = e.target.value.replace(/\D/g, "");
    if (v.length > 8) v = v.slice(0, 8);
    if (v.length > 4) v = v.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,4})/, "$1/$2");
    onChange(v);
  };

  const handleDateChange = (e) => {
    const val = e.target.value;
    if (!val) return onChange("");
    const [ano, mes, dia] = val.split("-");
    onChange(`${dia}/${mes}/${ano}`);
  };

  const valorNativo = () => safeValue.length === 10 ? safeValue.split("/").reverse().join("-") : "";

  return (
    <div className={`relative w-full border-b transition-all ${hasError ? 'shake-error !border-orange-500 opacity-100' : '!border-white/40 focus-within:!border-white opacity-80 hover:opacity-100'}`}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? '!text-orange-500' : '!text-white'} ${active ? "-top-5 text-[10px] opacity-100" : "top-1 text-sm opacity-80"}`}>{label}</label>
      <div className="relative flex items-center">
        {!usarCalendario ? (
          <input type="text" value={safeValue} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={handleTextChange} placeholder={isFocused ? "DD/MM/AAAA" : ""} className="w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 !text-white pr-10 placeholder-white/40" /> 
        ) : (
          <input type="date" value={valorNativo()} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={handleDateChange} className="w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 pr-10 !text-white [color-scheme:dark]" />
        )}
        <button type="button" onClick={() => setUsarCalendario(!usarCalendario)} className="absolute right-0 top-0 bottom-2 flex items-center !text-white opacity-40 hover:opacity-100 outline-none">
          {usarCalendario ? <Type size={16} /> : <Calendar size={16} />}
        </button>
      </div>
    </div>
  );
}

function Select({ id, label, value, options, onChange, hasError }) {
  const [isOpen, setIsOpen] = useState(false);
  const active = isOpen || (value !== undefined && value.toString().length > 0);
  const selected = options.find((opt) => opt.value === value);
  
  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>}
      <div className={`relative w-full border-b transition-all z-50 ${hasError ? 'shake-error !border-orange-500 opacity-100' : '!border-white/40 focus-within:!border-white opacity-80 hover:opacity-100'}`}>
        <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? '!text-orange-500' : '!text-white'} ${active ? "-top-5 text-[10px] opacity-100" : "top-1 text-sm opacity-80"}`}>{label}</label>
        <button type="button" onBlur={() => setTimeout(() => setIsOpen(false), 200)} onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full bg-transparent outline-none text-sm font-bold cursor-pointer py-2 text-left relative z-50">
          <span className={`truncate pr-6 ${hasError && !selected ? '!text-orange-500' : '!text-white'}`}>{selected ? selected.label : ""}</span>
          <ChevronDown size={16} className={`transition-transform duration-300 ${hasError ? '!text-orange-500' : '!text-white'} ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <ul className="absolute top-full left-0 w-full mt-2 z-50 rounded-2xl shadow-2xl border !border-white/30 overflow-hidden bg-[#1a1a1a]">
            {options.map((opt) => (
              <li key={String(opt.value)} onClick={() => { onChange(opt.value); setIsOpen(false); }} className="px-5 py-4 font-bold cursor-pointer transition-all text-[11px] hover:text-[13px] border-b !border-white/20 last:border-0 !text-white opacity-70 hover:opacity-100 hover:bg-white/10">{opt.label}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}