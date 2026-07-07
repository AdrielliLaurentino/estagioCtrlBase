import React, { useState, useEffect, useRef } from "react";
import { User, Loader2, Camera, ChevronDown, Calendar, Type, Image as ImageIcon } from "lucide-react";
import Webcam from "react-webcam";
import ModalLateral from "../common/ModalLateral";
import { validarCPF } from "../../utils/validadores"; 
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const valoresIniciais = {
  idUnidade: "", 
  nomeCompleto: "",
  cpf: "",
  email: "",
  dataNascimento: "",
  sexoBiologico: "", 
  ddi: "+55", 
  telefone: "",
  foto: null
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

const formatarNome = (nome) => {
  if (typeof nome !== 'string') return "";
  const preposicoes = ["da", "de", "di", "do", "du", "das", "dos"];
  return nome
    .toLowerCase()
    .split(' ')
    .map((palavra, index) => {
      if (!palavra) return "";
      if (index > 0 && preposicoes.includes(palavra)) return palavra;
      return palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(' ');
};

const desmembrarTelefone = (telefoneCompleto) => {
  let ddi = "+55";
  let tel = telefoneCompleto || "";
  if (tel.startsWith("+")) {
    const match = tel.match(/^(\+\d{1,3})\s?(.*)$/);
    if (match) {
      ddi = match[1];
      tel = match[2];
    }
  }
  return { ddi, tel };
};

const extrairIdUnidade = (userObj) => {
  let id = userObj?.unidade?.idUnidade || 
           userObj?.unidade?.id || 
           userObj?.idUnidade || 
           userObj?.unidadeId || 
           userObj?.idUnidadeSessao;
           
  if (!id) {
      try {
          const raw = JSON.parse(localStorage.getItem("usuario") || "{}");
          id = raw?.unidade?.idUnidade || 
               raw?.unidade?.id || 
               raw?.idUnidade || 
               raw?.unidadeId || 
               raw?.idUnidadeSessao;
      } catch(e) {}
  }

  if (!id) {
      try {
          const token = localStorage.getItem("@CtrlBase:token")?.replace(/['"]+/g, '').replace("Bearer ", "").trim();
          if (token) {
              const payload = JSON.parse(atob(token.split('.')[1]));
              id = payload?.unidade?.idUnidade || payload?.idUnidade || payload?.unidadeId;
          }
      } catch(e) {}
  }

  return id ? Number(id) : null;
};

export default function CadastroCliente({ onClose, dadosIniciais, onSalvo, isOpen = false }) {
  const { user } = useAuth();
  const idUnidadeSessao = extrairIdUnidade(user);
  
  const [form, setForm] = useState(valoresIniciais);
  const [loading, setLoading] = useState(false);
  const [erros, setErros] = useState([]);
  const [useCamera, setUseCamera] = useState(false);
  const [menuFotoAberto, setMenuFotoAberto] = useState(false);
  const webcamRef = useRef(null);
  const isEdicao = !!dadosIniciais;

  useEffect(() => {
    if (isOpen) {
      setUseCamera(false);
      setMenuFotoAberto(false);
      setErros([]);
      
      if (dadosIniciais) {
        const dataVisual = formatarDataParaVisual(dadosIniciais.dataNascimento);
        const { ddi, tel } = desmembrarTelefone(dadosIniciais.telefone);
        
        const unidadeBanco = dadosIniciais.idUnidade || dadosIniciais.unidadeOrigem?.idUnidade || idUnidadeSessao;

        setForm({ 
            ...valoresIniciais, 
            ...dadosIniciais, 
            idUnidade: unidadeBanco,
            dataNascimento: dataVisual, 
            ddi: ddi, 
            telefone: tel 
        });
      } else {
        setForm({ ...valoresIniciais, idUnidade: idUnidadeSessao });
      }
    }
  }, [isOpen, dadosIniciais, idUnidadeSessao]);

  const validarIdade = (dataNasc) => {
    if (!dataNasc || dataNasc.length < 10) return false;
    const [dia, mes, ano] = dataNasc.split("/");
    const y = parseInt(ano, 10);
    const m = parseInt(mes, 10);
    const d = parseInt(dia, 10);
    const data = new Date(y, m - 1, d);
    if (data.getFullYear() !== y || data.getMonth() !== m - 1 || data.getDate() !== d) return false;

    const hoje = new Date();
    let idade = hoje.getFullYear() - data.getFullYear();
    const difMes = hoje.getMonth() - data.getMonth();
    if (difMes < 0 || (difMes === 0 && hoje.getDate() < data.getDate())) idade--;
    return idade >= 9 && idade <= 100;
  };

  const capturarFoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setForm(prev => ({ ...prev, foto: imageSrc }));
      setUseCamera(false);
    }
  };

  const construirPayload = () => {
    const nomeLimpo = formatarNome(form.nomeCompleto.replace(/[^A-Za-zÀ-ÿ\s]/g, ""));
    
    let dataFormatadaBackend = "";
    if (form.dataNascimento && form.dataNascimento.includes("/")) {
      const [dia, mes, ano] = form.dataNascimento.split("/");
      dataFormatadaBackend = `${dia}-${mes}-${ano}`;
    }

    let telNumeros = form.telefone.replace(/\D/g, "");
    if (telNumeros.startsWith("55") && form.ddi.includes("55") && telNumeros.length > 11) {
        telNumeros = telNumeros.slice(2);
    }
    const ddiLimpo = form.ddi.replace(/[^\d+]/g, "");
    const telefoneLimpo = `${ddiLimpo}${telNumeros}`.slice(0, 15);

    if (!isEdicao) {
       return {
          idUnidade: Number(form.idUnidade || idUnidadeSessao),
          nomeCompleto: nomeLimpo,
          sexoBiologico: form.sexoBiologico,
          dataNascimento: dataFormatadaBackend,
          telefone: telefoneLimpo,
          cpf: form.cpf.replace(/\D/g, ""),
          login: form.cpf.replace(/\D/g, ""),
          email: form.email.toLowerCase(),
          senha: "SenhaProvisoria123"
       };
    }

    const payload = {};
    if (form.nomeCompleto !== dadosIniciais.nomeCompleto) {
        payload.nomeCompleto = nomeLimpo;
    }
    
    if (form.sexoBiologico !== dadosIniciais.sexoBiologico) {
        payload.sexoBiologico = form.sexoBiologico;
    }
    
    const telefoneOriginalLimpo = (dadosIniciais.telefone || "").replace(/\D/g, "");
    if (telefoneLimpo.replace(/\D/g, "") !== telefoneOriginalLimpo) {
        payload.telefone = telefoneLimpo;
    }

    const dataVisualOriginal = formatarDataParaVisual(dadosIniciais.dataNascimento);
    if (form.dataNascimento !== dataVisualOriginal) {
        payload.dataNascimento = dataFormatadaBackend;
    }

    if (form.email !== dadosIniciais.email && !form.email.includes('*')) {
        payload.email = form.email.toLowerCase();
    }

    if (form.cpf !== dadosIniciais.cpf && !form.cpf.includes('*')) {
        const cpfLimpo = form.cpf.replace(/\D/g, "");
        payload.cpf = cpfLimpo;
        payload.login = cpfLimpo; 
    }

    return payload;
  };

  const handleSalvar = async (e, fecharModalComAnimacao) => {
    e.preventDefault();
    
    const idParaSalvar = form.idUnidade || idUnidadeSessao;

    if (!idParaSalvar && !isEdicao) {
      alert("Erro Crítico de Sessão: A sua unidade não foi identificada pelo sistema (ex: Unidade 3). Saia do sistema e faça login novamente para restaurar a comunicação.");
      return;
    }

    const camposComErro = [];
    if (!form.nomeCompleto || form.nomeCompleto.trim().length < 3) camposComErro.push("nomeCompleto");
    if (!form.sexoBiologico) camposComErro.push("sexoBiologico");
    if (!form.dataNascimento || form.dataNascimento?.length !== 10) camposComErro.push("dataNascimento");
    if (!form.telefone || form.telefone?.replace(/\D/g, '').length < 10) camposComErro.push("telefone");

    const cpfEstaMascarado = form.cpf?.includes("*");
    const emailEstaMascarado = form.email?.includes("*");

    if (!cpfEstaMascarado) {
      if (!form.cpf || form.cpf.replace(/\D/g, '').length !== 11) camposComErro.push("cpf");
      else if (!validarCPF(form.cpf)) camposComErro.push("cpf_invalido");
    }

    if (!emailEstaMascarado && (!form.email || !form.email.includes("@"))) camposComErro.push("email");

    if (camposComErro.length > 0) {
      setErros(camposComErro.map(c => c === "cpf_invalido" ? "cpf" : c));
      setTimeout(() => setErros([]), 3000); 
      return;
    }

    if (!validarIdade(form.dataNascimento)) {
      alert("A data de nascimento não é válida ou a idade mínima (9 anos) não foi atingida.");
      setErros(["dataNascimento"]);
      setTimeout(() => setErros([]), 3000);
      return;
    }

    setLoading(true);
    
    try {
      const payload = construirPayload();
      
      if (isEdicao && Object.keys(payload).length === 0) {
         fecharModalComAnimacao();
         return;
      }

      const url = isEdicao ? `/clientes/${form.idCliente || form.id}` : "/clientes";
      const method = isEdicao ? "PATCH" : "POST";
      
      await api({
        url,
        method,
        data: payload
      });

      if (onSalvo) onSalvo();
      fecharModalComAnimacao();

    } catch (err) {
      const data = err.response?.data || {};
      if (data.backendErrors && data.backendErrors.length > 0) {
         const mensagens = data.backendErrors.map(e => `• ${e.campo}: ${e.mensagem || e.defaultMessage}`).join("\n");
         alert(`Corrija os seguintes campos:\n\n${mensagens}`);
         setErros(data.backendErrors.map(e => e.campo));
      } else {
         alert(data.message || data.erro || err.message || "Erro ao guardar cliente.");
      }
      setTimeout(() => setErros([]), 4000);
    } finally {
      setLoading(false);
    }
  };

  const iconeAvatar = (
    <div className="relative w-full h-full flex flex-col items-center justify-center !text-white">
      {useCamera ? (
        <>
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover rounded-full border-2 !border-white/60" />
          <button type="button" onClick={capturarFoto} className="absolute bottom-2 bg-white !text-black px-3 py-1 text-[9px] font-black uppercase rounded-full shadow-xl hover:scale-105 active:scale-95 transition-all z-20 outline-none">
            Capturar
          </button>
        </>
      ) : form.foto ? (
        <img src={form.foto} className="w-full h-full object-cover rounded-full border-2 !border-white/60" alt="Perfil" />
      ) : (
        <User size={40} className="!text-white opacity-80" />
      )}
      {!useCamera && (
        <button type="button" onClick={(e) => { e.stopPropagation(); setMenuFotoAberto(!menuFotoAberto); }} className="absolute -bottom-2 -right-2 p-2.5 border-2 !border-white/50 rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all z-20 bg-[#1a1a1a] !text-white outline-none">
          <Camera size={14} />
        </button>
      )}
      {menuFotoAberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuFotoAberto(false)}></div>
          <div className="absolute top-full mt-4 right-0 bg-[#1a1a1a] border !border-white/30 rounded-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 w-40 animate-in fade-in slide-in-from-top-2">
            <button type="button" onClick={() => { setUseCamera(true); setMenuFotoAberto(false); }} className="px-4 py-3 rounded-xl hover:bg-white/10 !text-white transition-colors text-left flex items-center gap-2 outline-none">
              <Camera size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Tirar Foto</span>
            </button>
            <label className="px-4 py-3 rounded-xl hover:bg-white/10 !text-white transition-colors text-left flex items-center gap-2 outline-none cursor-pointer">
              <ImageIcon size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Galeria</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                const file = e.target.files[0];
                if (file) { setForm(prev => ({ ...prev, foto: URL.createObjectURL(file) })); setMenuFotoAberto(false); }
              }} />
            </label>
          </div>
        </>
      )}
    </div>
  );

  const renderFooter = (fecharModalComAnimacao) => (
    <>
      <button type="button" onClick={fecharModalComAnimacao} className="flex-1 py-8 flex justify-center items-center opacity-70 hover:opacity-100 transition-all group outline-none">
          <span className="font-black uppercase text-sm group-hover:text-base transition-all duration-300 tracking-widest !text-white">Descartar</span>
      </button>
      <button type="submit" form="form-cliente" disabled={loading} onClick={(e) => handleSalvar(e, fecharModalComAnimacao)} className="flex-1 py-8 flex justify-center items-center gap-2 transition-all disabled:opacity-30 outline-none group">
          {loading && <Loader2 size={18} className="animate-spin !text-white" />} 
          <span className="font-black uppercase text-sm group-hover:text-base transition-all duration-300 tracking-widest !text-white">{isEdicao ? "Salvar" : "Registar"}</span>
      </button>
    </>
  );

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
        titulo={<span className="!text-white font-black uppercase italic tracking-tight">{isEdicao ? "Editar Cliente" : "Novo Cliente"}</span>} 
        subtitulo={<span className="!text-white opacity-80 font-bold uppercase tracking-widest text-[9px]">A palavra-passe provisória será enviada por e-mail</span>} 
        icone={iconeAvatar} 
        footer={renderFooter}
      >
        <div className="flex flex-col gap-10 pb-6 !text-white">
          <form id="form-cliente" onSubmit={(e) => e.preventDefault()} autoComplete="off" className="flex flex-col gap-10 mt-2">
            
            <Input id="nomeCompleto" label="Nome Completo *" value={form.nomeCompleto} onChange={(v) => setForm(prev => ({...prev, nomeCompleto: formatarNome(v)}))} hasError={erros.includes("nomeCompleto")} />
            
            <Input 
               id="cpf" 
               label="CPF (Usado como Login) *" 
               value={form.cpf} 
               onChange={(v) => setForm(prev => ({...prev, cpf: v}))} 
               mascara="cpf" 
               disabled={isEdicao} 
               hasError={erros.includes("cpf")}
               clearOnFocusIfMasked
            />
            
            <Input 
               id="email" 
               label="E-mail Pessoal *" 
               type="email" 
               value={form.email} 
               onChange={(v) => setForm(prev => ({...prev, email: v.toLowerCase()} ))} 
               hasError={erros.includes("email")} 
               clearOnFocusIfMasked
            />

            <Select id="sexoBiologico" label="Sexo *" value={form.sexoBiologico} options={[{ value: "MASCULINO", label: "Masculino" }, { value: "FEMININO", label: "Feminino" }]} onChange={(v) => setForm(prev => ({...prev, sexoBiologico: v}))} hasError={erros.includes("sexoBiologico")} />
            <InputData id="dataNascimento" label="Data de Nascimento *" value={form.dataNascimento} onChange={(v) => setForm(prev => ({...prev, dataNascimento: v}))} hasError={erros.includes("dataNascimento")} />
            <InputTelefone id="telefone" label="Telemóvel / Telefone *" ddiValue={form.ddi} onDdiChange={(v) => setForm(prev => ({...prev, ddi: v}))} telValue={form.telefone} onTelChange={(v) => setForm(prev => ({...prev, telefone: v}))} hasError={erros.includes("telefone")} />
          </form>
        </div>
      </ModalLateral>
    </>
  );
}

function InputTelefone({ id, label, ddiValue, onDdiChange, telValue, onTelChange, hasError }) {
  const [isFocused, setIsFocused] = useState(false);
  const active = isFocused || telValue?.length > 0 || ddiValue?.length > 0;
  
  const format = (val) => {
    if (!val) return "";
    const limpo = val.replace(/\D/g, "").slice(0, 11);
    return limpo.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4,5})(\d{4})$/, "$1-$2");
  };

  return (
    <div className={`relative w-full border-b transition-all ${hasError ? 'shake-error !border-orange-500 opacity-100' : '!border-white/40 focus-within:!border-white opacity-80 hover:opacity-100'}`}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? '!text-orange-500' : '!text-white'} ${active ? "-top-5 text-[10px] opacity-100" : "top-1 text-sm opacity-80"}`}>{label}</label>
      <div className="flex items-center w-full">
        <input type="text" value={ddiValue} onChange={(e) => onDdiChange(e.target.value.replace(/[^\d+]/g, '').slice(0, 4))} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} placeholder="+55" className="w-10 bg-transparent outline-none text-sm font-bold pb-2 pt-1 text-center border-r !border-white/30 !text-white placeholder-white/40" />
        <input id={id} type="text" value={format(telValue)} onChange={(e) => onTelChange(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} placeholder={isFocused ? "(00) 00000-0000" : ""} className="flex-1 w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 pl-3 !text-white placeholder-white/40" />
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
  const active = isOpen || (value && value.toString().length > 0);
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
              <li key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className="px-5 py-4 font-bold cursor-pointer transition-all text-[11px] hover:text-[13px] border-b !border-white/20 last:border-0 !text-white opacity-70 hover:opacity-100 hover:bg-white/10">{opt.label}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Input({ id, label, value, onChange, type = "text", mascara, disabled = false, hasError = false, clearOnFocusIfMasked = false }) {
  const safeValue = value ?? "";
  const [isFocused, setIsFocused] = useState(false);
  const active = isFocused || (safeValue.toString().length > 0);
  
  const format = (val) => {
    if (!val || mascara !== "cpf") return val;
    let limpo = val.replace(/\D/g, "").slice(0, 11);
    return limpo.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  const handleFocus = () => {
    if (disabled) return;
    setIsFocused(true);
    if (clearOnFocusIfMasked && safeValue.includes('*')) onChange('');
  };
  
  return (
    <div className={`relative w-full border-b transition-all ${disabled ? '!border-white/30 opacity-40 cursor-not-allowed border-dashed' : hasError ? 'shake-error !border-orange-500 opacity-100' : '!border-white/40 focus-within:!border-white opacity-80 hover:opacity-100'}`}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? '!text-orange-500' : '!text-white'} ${active ? "-top-5 text-[10px] opacity-100" : "top-1 text-sm opacity-80"}`}>{label}</label>
      <input type={type} value={safeValue} onFocus={handleFocus} onBlur={() => !disabled && setIsFocused(false)} onChange={(e) => !disabled && onChange(format(e.target.value))} disabled={disabled} className={`w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 ${hasError ? '!text-orange-500' : '!text-white'} placeholder-white/40`} />
    </div>
  );
}