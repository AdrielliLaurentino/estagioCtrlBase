import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { User, Loader2, Camera, ChevronDown, Calendar, Type, Image as ImageIcon, Search, CheckCircle2, Lock } from "lucide-react";
import Webcam from "react-webcam";
import ModalLateral from "../common/ModalLateral";
import { validarCPF } from "../../utils/validadores"; 
import { apiFetch } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const MAPA_PERFIL_ACESSO = {
  ADMIN: 1,
  DONO: 2,
  GERENTE: 3,
  LIDER_VENDA: 4,
  RECEPCIONISTA: 5,
  PERSONAL_TRAINER: 6
};

const valoresIniciais = {
  cargo: "", 
  nomeCompleto: "",
  cpf: "",
  email: "",
  dataNascimento: "",
  sexoBiologico: "", 
  ddi: "+55", 
  telefone: "",
  foto: null,
  idClienteOrigem: null,
  senhaConfirmacao: ""
};

const decodeJWT = (token) => {
  try {
    if (!token) return null;
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
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
  return partes[0].length === 4 ? `${partes[2]}/${partes[1]}/${partes[0]}` : `${partes[0]}/${partes[1]}/${partes[2]}`;
};

const formatarNome = (nome) => {
  if (typeof nome !== 'string') return "";
  const preposicoes = new Set(["da", "de", "di", "do", "du", "das", "dos"]);
  return nome
    .toLowerCase()
    .split(' ') 
    .map((palavra, index) => {
      if (!palavra) return "";
      return (index > 0 && preposicoes.has(palavra)) ? palavra : palavra.charAt(0).toUpperCase() + palavra.slice(1);
    })
    .join(' ');
};

const desmembrarTelefone = (telefoneCompleto) => {
  const tel = telefoneCompleto || "";
  if (tel.startsWith("+55")) return { ddi: "+55", tel: tel.slice(3).trim() };
  if (tel.startsWith("+351")) return { ddi: "+351", tel: tel.slice(4).trim() };
  
  const match = tel.match(/^(\+\d{1,3})\s+(.*)$/);
  return match ? { ddi: match[1], tel: match[2] } : { ddi: "+55", tel };
};

export default function CadastroColaborador({ onClose, dadosIniciais, onSalvo, isOpen = false }) {
  const { user } = useAuth(); 
  const idUnidadeAtual = user?.idUnidadeSessao || user?.idUnidade || user?.unidadeId;
  const idOperadorLogado = user?.idFuncionario || user?.id; 

  const [form, setForm] = useState(valoresIniciais);
  const [loading, setLoading] = useState(false);
  const [erros, setErros] = useState([]);
  
  const [useCamera, setUseCamera] = useState(false);
  const [menuFotoAberto, setMenuFotoAberto] = useState(false);
  const webcamRef = useRef(null);
  
  const [termoBusca, setTermoBusca] = useState("");
  const [resultadosClientes, setResultadosClientes] = useState([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [clienteSelecionadoMsg, setClienteSelecionadoMsg] = useState("");

  const isEdicao = Boolean(dadosIniciais);
  const editandoDadosSensiveis = useMemo(() => {
    return isEdicao && form.email && form.email !== dadosIniciais?.email && !form.email.includes('*');
  }, [isEdicao, form.email, dadosIniciais]);

  const opcoesCargo = useMemo(() => [
    { value: "RECEPCIONISTA", label: "Recepcionista" },
    { value: "PERSONAL_TRAINER", label: "Personal Trainer" },
    { value: "LIDER_VENDA", label: "Líder de Vendas" },
    { value: "GERENTE", label: "Gerente" }
  ], []);

  useEffect(() => {
    if (!isOpen) return;
    setUseCamera(false);
    setMenuFotoAberto(false);
    setErros([]);
    setTermoBusca("");
    setResultadosClientes([]);
    setClienteSelecionadoMsg("");
    
    if (dadosIniciais) {
      const dataVisual = formatarDataParaVisual(dadosIniciais.dataNascimento);
      const { ddi, tel } = desmembrarTelefone(dadosIniciais.telefone);
      setForm({ ...valoresIniciais, ...dadosIniciais, dataNascimento: dataVisual, ddi, telefone: tel });
    } else {
      setForm(valoresIniciais);
    }
  }, [isOpen, dadosIniciais]);

  const buscarClientesAPI = useCallback(async (termo) => {
    if (!termo || termo.length < 3) { setResultadosClientes([]); return; }
    
    setBuscandoClientes(true);
    try {
      const response = await apiFetch(`/clientes?busca=${encodeURIComponent(termo)}`);
      const data = await response.json();
      const lista = Array.isArray(data) ? data : (data.content || []);
      
      const termoLimpo = termo.toLowerCase().trim();
      const termoNumerico = termo.replace(/\D/g, '');

      const filtrados = lista.filter(c => {
        if (c.ativo === false) return false;
        const nomeMatch = (c.nomeCompleto || c.nome || "").toLowerCase().includes(termoLimpo);
        const cpfMatch = termoNumerico && c.cpf ? c.cpf.replace(/\D/g, '').includes(termoNumerico) : false;
        return nomeMatch || cpfMatch;
      });

      setResultadosClientes(filtrados.slice(0, 5));
    } catch (error) {
      console.error("Erro ao buscar clientes:", error);
    } finally {
      setBuscandoClientes(false);
    }
  }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => buscarClientesAPI(termoBusca), 500);
    return () => clearTimeout(delayDebounce);
  }, [termoBusca, buscarClientesAPI]);

  const selecionarCliente = (cliente) => {
    const { ddi, tel } = desmembrarTelefone(cliente.telefone);
    const cpfImportado = (cliente.cpf || "").includes("*") ? "" : cliente.cpf;
    const emailImportado = (cliente.email || "").includes("*") ? "" : (cliente.email || "").toLowerCase();

    setForm(prev => ({
      ...prev,
      nomeCompleto: formatarNome(cliente.nomeCompleto || cliente.nome),
      cpf: cpfImportado,
      email: emailImportado,
      dataNascimento: formatarDataParaVisual(cliente.dataNascimento),
      sexoBiologico: cliente.sexoBiologico || "",
      telefone: tel,
      ddi: ddi,
      idClienteOrigem: cliente.id || cliente.idCliente
    }));

    setTermoBusca(""); 
    setResultadosClientes([]);
    
    const msgStatus = (!cpfImportado || !emailImportado) 
        ? "Preencha os dados em branco." 
        : "";
    setClienteSelecionadoMsg(`Importado: ${formatarNome(cliente.nomeCompleto || cliente.nome)}. ${msgStatus}`);
    setTimeout(() => setClienteSelecionadoMsg(""), 5000);
  };

  const capturarFoto = useCallback(() => {
    if (webcamRef.current) {
      setForm(prev => ({ ...prev, foto: webcamRef.current.getScreenshot() }));
      setUseCamera(false);
    }
  }, []);

  const construirPayload = useCallback(() => {
    const nomeLimpo = formatarNome(form.nomeCompleto.replace(/[^A-Za-zÀ-ÿ\s]/g, ""));
    const partes = nomeLimpo.split(" ");
    let nomeRegistro = partes[0] || "Colaborador"; 
    
    if (nomeRegistro.length < 3 && partes.length > 1) {
      nomeRegistro = `${partes[0]} ${partes[1]}`;
    }
    
    let dataFormatadaBackend = "";
    if (form.dataNascimento && form.dataNascimento.includes("/")) {
      const [dia, mes, ano] = form.dataNascimento.split("/");
      dataFormatadaBackend = `${dia}-${mes}-${ano}`;
    }

    const telNumeros = form.telefone.replace(/\D/g, "");
    const telefoneLimpo = `${form.ddi.replace(/[^\d+]/g, "")}${telNumeros}`.slice(0, 15);

    if (!isEdicao) {
       return {
          idUnidade: Number(idUnidadeAtual), 
          idPerfilAcesso: MAPA_PERFIL_ACESSO[form.cargo] || 1, 
          cargo: form.cargo,
          nomeCompleto: nomeLimpo,
          nomeRegistro: nomeRegistro.charAt(0).toUpperCase() + nomeRegistro.slice(1).toLowerCase(),
          sexoBiologico: form.sexoBiologico,
          dataNascimento: dataFormatadaBackend,
          telefone: telefoneLimpo,
          cpf: form.cpf.replace(/\D/g, ""),
          login: form.cpf.replace(/\D/g, ""), 
          email: form.email.toLowerCase(),
          senha: "SenhaProvisoria123", 
          ...(form.idClienteOrigem && { idClienteOrigem: form.idClienteOrigem })
       };
    }

    const payload = {};
    if (form.nomeCompleto !== dadosIniciais.nomeCompleto) {
        payload.nomeCompleto = nomeLimpo;
        payload.nomeRegistro = nomeRegistro.charAt(0).toUpperCase() + nomeRegistro.slice(1).toLowerCase();
    }
    if (form.cargo !== dadosIniciais.cargo) payload.cargo = form.cargo;
    if (form.sexoBiologico !== dadosIniciais.sexoBiologico) payload.sexoBiologico = form.sexoBiologico;
    if (telefoneLimpo.replace(/\D/g, "") !== (dadosIniciais.telefone || "").replace(/\D/g, "")) payload.telefone = telefoneLimpo;
    if (form.dataNascimento !== formatarDataParaVisual(dadosIniciais.dataNascimento)) payload.dataNascimento = dataFormatadaBackend;
    if (form.email !== dadosIniciais.email && !form.email.includes('*')) payload.email = form.email.toLowerCase();

    return payload;
  }, [form, isEdicao, idUnidadeAtual, dadosIniciais]);

  const handleSalvar = async (e, fecharModal) => {
    e.preventDefault();
    
    if (!idUnidadeAtual && !isEdicao) {
      return alert("Erro de Sessão: Não foi possível identificar a sua unidade atual.");
    }

    const camposErro = [];
    if (!form.cargo) camposErro.push("cargo");
    if (!form.nomeCompleto || form.nomeCompleto.trim().length < 5) camposErro.push("nomeCompleto");
    if (!form.sexoBiologico) camposErro.push("sexoBiologico");
    if (!form.dataNascimento || form.dataNascimento?.length !== 10) camposErro.push("dataNascimento");
    if (!form.telefone || form.telefone?.replace(/\D/g, '').length < 10) camposErro.push("telefone");
    if (!form.email || !form.email.includes("@")) camposErro.push("email");
    if (editandoDadosSensiveis && !form.senhaConfirmacao) camposErro.push("senhaConfirmacao");

    if (!isEdicao) {
       const cpfLimpo = form.cpf.replace(/\D/g, '');
       if (cpfLimpo.length !== 11 || !validarCPF(form.cpf)) camposErro.push("cpf");
    }

    if (camposErro.length > 0) {
      setErros(camposErro);
      setTimeout(() => setErros([]), 3000); 
      return;
    }

    setLoading(true);
    
    try {
      if (editandoDadosSensiveis) {
         const token = localStorage.getItem("@CtrlBase:token")?.replace(/['"]+/g, '').replace("Bearer ", "").trim();
         const loginOperador = decodeJWT(token)?.sub || user?.login || user?.username;

         if (!loginOperador) throw new Error("Não foi possível identificar a sua conta para validar a autorização.");

         const authResponse = await fetch('/api/auth/login', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ login: loginOperador, senha: form.senhaConfirmacao })
         });

         if (!authResponse.ok) {
            setErros(prev => [...prev, "senhaConfirmacao"]);
            throw new Error("Palavra-passe incorreta.");
         }
      }

      const payload = construirPayload();
      if (isEdicao && Object.keys(payload).length === 0) return fecharModal();

      await apiFetch(isEdicao ? `/funcionarios/${form.idFuncionario || form.id}` : "/funcionarios", {
        method: isEdicao ? "PATCH" : "POST",
        headers: {
            "Content-Type": "application/json",
            "id-operador": idOperadorLogado 
        },
        body: JSON.stringify(payload)
      });

      if (onSalvo) onSalvo();
      fecharModal();

    } catch (err) {
      if (err.errors && err.errors.length > 0) {
         alert(`Corrija os campos:\n\n${err.errors.map(e => `• ${e.campo}: ${e.mensagem}`).join("\n")}`);
         setErros(err.errors.map(e => e.campo));
      } else {
         alert(err.message || "Ocorreu um erro ao guardar os dados do colaborador.");
      }
      setTimeout(() => setErros([]), 4000);
    } finally {
      setLoading(false);
    }
  };

  const renderIcone = (
    <div className="relative w-full h-full flex flex-col items-center justify-center text-white">
      {useCamera ? (
        <>
          <Webcam ref={webcamRef} screenshotFormat="image/jpeg" className="w-full h-full object-cover rounded-full border-2 border-white/60" />
          <button type="button" onClick={capturarFoto} className="absolute bottom-2 bg-white text-black px-3 py-1 text-[9px] font-black uppercase rounded-full shadow-xl hover:scale-105 transition-transform z-20 outline-none">
            Capturar
          </button>
        </>
      ) : form.foto ? (
        <img src={form.foto} className="w-full h-full object-cover rounded-full border-2 border-white/60" alt="Perfil" />
      ) : (
        <User size={40} className="text-white opacity-80" />
      )}
      {!useCamera && (
        <button type="button" onClick={(e) => { e.stopPropagation(); setMenuFotoAberto(p => !p); }} className="absolute -bottom-2 -right-2 p-2.5 border-2 border-white/50 rounded-full shadow-xl hover:scale-110 transition-transform z-20 bg-neutral-900 text-white outline-none">
          <Camera size={14} />
        </button>
      )}
      {menuFotoAberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuFotoAberto(false)} />
          <div className="absolute top-full mt-4 right-0 bg-neutral-900 border border-white/30 rounded-2xl shadow-2xl p-1.5 z-50 flex flex-col gap-1 w-40 animate-in fade-in slide-in-from-top-2">
            <button type="button" onClick={() => { setUseCamera(true); setMenuFotoAberto(false); }} className="px-4 py-3 rounded-xl hover:bg-white/10 text-white transition-colors text-left flex items-center gap-2 outline-none">
              <Camera size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Tirar Foto</span>
            </button>
            <label className="px-4 py-3 rounded-xl hover:bg-white/10 text-white transition-colors text-left flex items-center gap-2 outline-none cursor-pointer">
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

  return (
    <>
      <style>{`
        input:-webkit-autofill { transition: background-color 5000s ease-in-out 0s; -webkit-text-fill-color: white !important; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25%, 75% { transform: translateX(-4px); } 50% { transform: translateX(4px); } }
        .shake-error { animation: shake 0.3s ease-in-out; border-color: #f97316 !important; }
        ::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; opacity: 0.6; }
      `}</style>
      
      <ModalLateral 
        isOpen={isOpen} 
        onClose={onClose} 
        titulo={<span className="text-white font-black uppercase italic tracking-tight">{isEdicao ? "Editar Colaborador" : "Novo Colaborador"}</span>} 
        subtitulo={<span className="text-white opacity-80 font-bold uppercase tracking-widest text-[9px]">Senha provisória enviada por e-mail</span>} 
        icone={renderIcone} 
        footer={(fecharModal) => (
            <>
              <button type="button" onClick={fecharModal} className="flex-1 py-8 flex justify-center items-center opacity-70 hover:opacity-100 transition-opacity group outline-none">
                  <span className="font-black uppercase text-sm tracking-widest text-white">Descartar</span>
              </button>
              <button type="submit" form="form-colaborador" disabled={loading} onClick={(e) => handleSalvar(e, fecharModal)} className="flex-1 py-8 flex justify-center items-center gap-2 transition-opacity disabled:opacity-30 outline-none group">
                  {loading && <Loader2 size={18} className="animate-spin text-white" />} 
                  <span className="font-black uppercase text-sm tracking-widest text-white">{isEdicao ? "Salvar" : "Registrar"}</span>
              </button>
            </>
        )}
      >
        <div className="flex flex-col gap-8 pb-6 text-white">
          {!isEdicao && (
            <div className="flex flex-col gap-2">
              <InputBusca 
                id="buscaCliente" label="Importar dados" placeholder="Buscar cliente por nome ou CPF..." 
                value={termoBusca} onChange={setTermoBusca} buscando={buscandoClientes} 
                resultados={resultadosClientes} onSelecionar={selecionarCliente} 
              />
              {clienteSelecionadoMsg && (
                <div className="flex items-center gap-2 text-orange-400 text-[10px] font-black uppercase tracking-widest animate-in fade-in">
                  <CheckCircle2 size={12} />{clienteSelecionadoMsg}
                </div>
              )}
            </div>
          )}
          
          <form id="form-colaborador" onSubmit={(e) => e.preventDefault()} autoComplete="off" className="flex flex-col gap-8 mt-2">
            <Select 
              id="cargo" label="Perfil / Cargo *" value={form.cargo} options={opcoesCargo} 
              onChange={(v) => setForm(prev => ({...prev, cargo: v}))} hasError={erros.includes("cargo")} 
            />
            <Input 
              id="nomeCompleto" label="Nome Completo *" value={form.nomeCompleto} 
              onChange={(v) => setForm(prev => ({...prev, nomeCompleto: formatarNome(v)}))} hasError={erros.includes("nomeCompleto")} 
            />
            <Input 
               id="cpf" label="CPF (Usado como Login) *" value={form.cpf} mascara="cpf" disabled={isEdicao} 
               onChange={(v) => setForm(prev => ({...prev, cpf: v}))} hasError={erros.includes("cpf")}
            />
            <Input 
               id="email" label="E-mail Pessoal *" type="email" value={form.email} clearOnFocusIfMasked
               onChange={(v) => setForm(prev => ({...prev, email: v.toLowerCase()} ))} hasError={erros.includes("email")} 
            />
            
            {editandoDadosSensiveis && (
               <div className="animate-in fade-in slide-in-from-top-4 flex flex-col pt-2">
                  <div className="flex items-center gap-2 text-orange-400/80 mb-4">
                    <Lock size={12} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Confirme sua senha para autorizar</span>
                  </div>
                  <Input 
                     id="chave_autorizacao_operador" label="Senha do operador logado *" type="password" 
                     value={form.senhaConfirmacao} onChange={(v) => setForm(prev => ({...prev, senhaConfirmacao: v}))} 
                     hasError={erros.includes("senhaConfirmacao")} autoComplete="new-password" blockPaste
                  />
               </div>
            )}

            <Select 
              id="sexoBiologico" label="Sexo *" value={form.sexoBiologico} 
              options={[{ value: "MASCULINO", label: "Masculino" }, { value: "FEMININO", label: "Feminino" }]} 
              onChange={(v) => setForm(prev => ({...prev, sexoBiologico: v}))} hasError={erros.includes("sexoBiologico")} 
            />
            <InputData 
              id="dataNascimento" label="Data de Nascimento *" value={form.dataNascimento} 
              onChange={(v) => setForm(prev => ({...prev, dataNascimento: v}))} hasError={erros.includes("dataNascimento")} 
            />
            <InputTelefone 
              id="telefone" label="Telefone / Celular *" ddiValue={form.ddi} telValue={form.telefone} 
              onDdiChange={(v) => setForm(prev => ({...prev, ddi: v}))} onTelChange={(v) => setForm(prev => ({...prev, telefone: v}))} 
              hasError={erros.includes("telefone")} 
            />
          </form>
        </div>
      </ModalLateral>
    </>
  );
}


function InputBusca({ id, label, value, onChange, placeholder, buscando, resultados, onSelecionar }) {
  const [isFocused, setIsFocused] = useState(false);
  const active = isFocused || Boolean(value?.toString().length);

  return (
    <div className="relative w-full border-b border-white/40 focus-within:border-white transition-colors opacity-80 hover:opacity-100 focus-within:opacity-100">
      <label htmlFor={id} className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter flex items-center gap-1.5 ${active ? "-top-5 text-[10px] opacity-100 text-white" : "top-1 text-sm opacity-80 text-white"}`}>
        <Search size={12} className={active ? "opacity-100" : "opacity-0"}/> {label}
      </label>
      <div className="relative">
        <input id={id} type="text" value={value} onFocus={() => setIsFocused(true)} onBlur={() => setTimeout(() => setIsFocused(false), 200)} onChange={(e) => onChange(e.target.value)} placeholder={isFocused ? placeholder : ""} className="w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 text-white pr-8 placeholder-white/40" autoComplete="off" />
        {buscando && <Loader2 size={14} className="absolute right-0 top-1 animate-spin text-white opacity-50" />}
      </div>
      {resultados.length > 0 && isFocused && (
        <ul className="absolute top-full left-0 w-full mt-2 z-50 bg-neutral-900 border border-white/30 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
          {resultados.map(cliente => (
            <li key={cliente.id || cliente.idCliente} onMouseDown={() => onSelecionar(cliente)} className="px-4 py-3 cursor-pointer hover:bg-white/10 border-b border-white/20 last:border-0 flex flex-col">
              <span className="text-white text-xs font-bold">{formatarNome(cliente.nomeCompleto || cliente.nome)}</span>
              <span className="text-white opacity-60 text-[10px] font-black tracking-widest">{cliente.cpf}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InputTelefone({ id, label, ddiValue, onDdiChange, telValue, onTelChange, hasError }) {
  const [isFocused, setIsFocused] = useState(false);
  const active = isFocused || telValue?.length > 0 || ddiValue?.length > 0;
  
  const format = (val) => {
    if (!val) return "";
    const limpo = val.replace(/\D/g, "").slice(0, 11);
    if (limpo.length <= 2) return limpo;
    if (limpo.length <= 6) return `(${limpo.slice(0, 2)}) ${limpo.slice(2)}`;
    if (limpo.length <= 10) return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6)}`;
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7)}`;
  };

  return (
    <div className={`relative w-full border-b transition-colors ${hasError ? 'shake-error border-orange-500 opacity-100' : 'border-white/40 focus-within:border-white opacity-80 hover:opacity-100'}`}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? 'text-orange-500' : 'text-white'} ${active ? "-top-5 text-[10px] opacity-100" : "top-1 text-sm opacity-80"}`}>{label}</label>
      <div className="flex items-center w-full">
        <input type="text" value={ddiValue} onChange={(e) => onDdiChange(e.target.value.replace(/[^\d+]/g, '').slice(0, 4))} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} placeholder="+55" className="w-10 bg-transparent outline-none text-sm font-bold pb-2 pt-1 text-center border-r border-white/30 text-white placeholder-white/40" />
        <input id={id} type="text" value={format(telValue)} onChange={(e) => onTelChange(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} placeholder={isFocused ? "(00) 00000-0000" : ""} className="flex-1 w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 pl-3 text-white placeholder-white/40" />
      </div>
    </div>
  );
}

function InputData({ id, label, value, onChange, hasError }) {
  const [isFocused, setIsFocused] = useState(false);
  const [usarCalendario, setUsarCalendario] = useState(false); 
  const active = isFocused || Boolean(value?.length);
  
  const handleTextChange = (e) => {
    let v = e.target.value.replace(/\D/g, "").slice(0, 8);
    if (v.length > 4) v = v.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,4})/, "$1/$2");
    onChange(v);
  };

  const valorNativo = value?.length === 10 ? value.split("/").reverse().join("-") : "";

  return (
    <div className={`relative w-full border-b transition-colors ${hasError ? 'shake-error border-orange-500 opacity-100' : 'border-white/40 focus-within:border-white opacity-80 hover:opacity-100'}`}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? 'text-orange-500' : 'text-white'} ${active ? "-top-5 text-[10px] opacity-100" : "top-1 text-sm opacity-80"}`}>{label}</label>
      <div className="relative flex items-center">
        {!usarCalendario ? (
          <input type="text" value={value || ""} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={handleTextChange} placeholder={isFocused ? "DD/MM/AAAA" : ""} className="w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 text-white pr-10 placeholder-white/40" /> 
        ) : (
          <input type="date" value={valorNativo} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={(e) => {
            if (!e.target.value) return onChange("");
            const [ano, mes, dia] = e.target.value.split("-");
            onChange(`${dia}/${mes}/${ano}`);
          }} className="w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 pr-10 text-white [color-scheme:dark]" />
        )}
        <button type="button" onClick={() => setUsarCalendario(!usarCalendario)} className="absolute right-0 top-0 bottom-2 flex items-center text-white opacity-40 hover:opacity-100 outline-none transition-opacity">
          {usarCalendario ? <Type size={16} /> : <Calendar size={16} />}
        </button>
      </div>
    </div>
  );
}

function Select({ id, label, value, options, onChange, hasError }) {
  const [isOpen, setIsOpen] = useState(false);
  const active = isOpen || Boolean(value?.toString().length);
  const selected = options.find((opt) => opt.value === value);
  
  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
      <div className={`relative w-full border-b transition-colors z-50 ${hasError ? 'shake-error border-orange-500 opacity-100' : 'border-white/40 focus-within:border-white opacity-80 hover:opacity-100'}`}>
        <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? 'text-orange-500' : 'text-white'} ${active ? "-top-5 text-[10px] opacity-100" : "top-1 text-sm opacity-80"}`}>{label}</label>
        <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex items-center justify-between w-full bg-transparent outline-none text-sm font-bold cursor-pointer py-2 text-left relative z-50">
          <span className={`truncate pr-6 ${hasError && !selected ? 'text-orange-500' : 'text-white'}`}>{selected?.label || ""}</span>
          <ChevronDown size={16} className={`transition-transform duration-300 ${hasError ? 'text-orange-500' : 'text-white'} ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        {isOpen && (
          <ul className="absolute top-full left-0 w-full mt-2 z-50 rounded-2xl shadow-2xl border border-white/30 overflow-hidden bg-neutral-900 animate-in fade-in slide-in-from-top-2">
            {options.map((opt) => (
              <li key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} className="px-5 py-4 font-bold cursor-pointer transition-colors text-[11px] hover:text-[13px] border-b border-white/20 last:border-0 text-white opacity-70 hover:opacity-100 hover:bg-white/10">{opt.label}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function Input({ id, label, value, onChange, type = "text", mascara, disabled = false, hasError = false, clearOnFocusIfMasked = false, autoComplete = "off", blockPaste = false }) {
  const [isFocused, setIsFocused] = useState(false);
  const active = isFocused || Boolean(value?.toString().length);
  
  const format = (val) => {
    if (!val || mascara !== "cpf") return val;
    return val.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };
  
  return (
    <div className={`relative w-full border-b transition-colors ${disabled ? 'border-white/30 opacity-40 cursor-not-allowed border-dashed' : hasError ? 'shake-error border-orange-500 opacity-100' : 'border-white/40 focus-within:border-white opacity-80 hover:opacity-100'}`}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? 'text-orange-500' : 'text-white'} ${active ? "-top-5 text-[10px] opacity-100" : "top-1 text-sm opacity-80"}`}>{label}</label>
      <input 
        id={id} type={type} value={value || ""} disabled={disabled} autoComplete={autoComplete}
        onFocus={() => { if (!disabled) { setIsFocused(true); if (clearOnFocusIfMasked && value?.includes('*')) onChange(''); } }} 
        onBlur={() => !disabled && setIsFocused(false)} 
        onChange={(e) => !disabled && onChange(format(e.target.value))} 
        onPaste={(e) => blockPaste && e.preventDefault()} onCopy={(e) => blockPaste && e.preventDefault()} onDrop={(e) => blockPaste && e.preventDefault()}
        className={`w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 ${hasError ? 'text-orange-500' : 'text-white'} placeholder-white/40`} 
      />
    </div>
  );
}