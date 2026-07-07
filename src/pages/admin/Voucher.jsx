import React, { useState, useEffect, useRef } from "react";
import { 
  Calendar, Loader2, User, ClipboardList, CheckCircle, ChevronDown, 
  Clock, Info, ArrowLeft, Type 
} from "lucide-react";
import ModalLateral from '../../components/modal/ModalLateral';
import apiFetch from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const getDataHoje = () => {
  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, '0');
  const mes = String(hoje.getMonth() + 1).padStart(2, '0');
  const ano = hoje.getFullYear();
  return `${dia}/${mes}/${ano}`;
};

const parseData = (dataStr) => {
  if (!dataStr || dataStr.length !== 10) return new Date(0);
  const [d, m, y] = dataStr.split('/');
  return new Date(y, m - 1, d, 0, 0, 0, 0);
};

export default function CadastroAgendamento({ isOpen, onClose, onSucesso }) {
  const { user } = useAuth();
  
  const idUnidadeAtual = user?.idUnidadeSessao || user?.idUnidade || user?.unidadeId;
  const cargoUsuario = user?.cargo?.toUpperCase() || "";
  const isCliente = !cargoUsuario || cargoUsuario === "CLIENTE";
  const [loading, setLoading] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [erros, setErros] = useState([]);
  const [erroGlobal, setErroGlobal] = useState(null);
  const [passo, setPasso] = useState(1);
  const [tipoAtual, setTipoAtual] = useState("");
  const [funcionarios, setFuncionarios] = useState([]);
  const [servicos, setServicos] = useState([]);
  const [modelosTarefa] = useState([
     { id: 1, nome: "Manutenção de Equipamento" },
     { id: 2, nome: "Reunião de Alinhamento" },
     { id: 3, nome: "Limpeza Geral" },
     { id: "CUSTOM", nome: "+ Outra (Personalizada)..." }
  ]);

  const [tipoAvaliador, setTipoAvaliador] = useState("INTERNO"); 
  const [cpfPersonalExterno, setCpfPersonalExterno] = useState("");
  const [idFuncionario, setIdFuncionario] = useState("");
  const [idCliente, setIdCliente] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [dataSelecionada, setDataSelecionada] = useState(getDataHoje()); 
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [idServico, setIdServico] = useState("");
  const [idModeloTarefa, setIdModeloTarefa] = useState("");
  const [tarefaCustomizada, setTarefaCustomizada] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const ehTarefa = tipoAtual === "TAREFA";

  useEffect(() => {
    if (!isOpen || !idUnidadeAtual) return;

    const carregarDependencias = async () => {
      setLoadingConfig(true);
      setErroGlobal(null);

      try {
        const [resFunc, resServicos] = await Promise.allSettled([
          apiFetch("/funcionarios"),
          apiFetch(`/servicos/unidade/${idUnidadeAtual}?size=100`) 
        ]);

        if (resFunc.status === "fulfilled") {
           const funcData = await resFunc.value.json();
           setFuncionarios(Array.isArray(funcData) ? funcData : (funcData.content || []));
        }
        
        if (resServicos.status === "fulfilled") {
           const servData = await resServicos.value.json();
           setServicos(Array.isArray(servData) ? servData : (servData.content || []));
        }

        if (isCliente) {
           setIdCliente(user?.id || user?.idCliente);
           setClienteNome(user?.nomeCompleto || user?.nome);
        }
      } catch {
        setErroGlobal("Falha ao sincronizar com o servidor. Verifique a sua conexão.");
      } finally {
        setLoadingConfig(false);
      }
    };

    carregarDependencias();
    setPasso(1);
    setTipoAtual("");
    setTipoAvaliador("INTERNO");
    setCpfPersonalExterno("");
    setIdFuncionario(""); 
    if(!isCliente) { setIdCliente(""); setClienteNome(""); }
    setDataSelecionada(getDataHoje()); 
    setHoraInicio(""); setHoraFim(""); 
    setIdServico(""); setIdModeloTarefa(""); setTarefaCustomizada(""); setObservacoes("");
    setErros([]);
  }, [isOpen, isCliente, user, idUnidadeAtual]);

  const avancarParaPasso2 = (tipo) => {
    setTipoAtual(tipo);
    setPasso(2);
    setErros([]);
    setErroGlobal(null);
  };

  const voltarParaPasso1 = () => {
    setPasso(1);
    setTipoAtual("");
    setErros([]);
  };

  const handleHoraInicioChange = (val) => {
    setHoraInicio(val);
    if (!val) { setHoraFim(""); return; }
    
    const [h, m] = val.split(':').map(Number);
    const dateCalc = new Date();
    dateCalc.setHours(h, m, 0, 0);
    let acrescimo = 30;
    if (ehTarefa) {
        acrescimo = 30;
    } else {
        const servicoSelecionado = servicos.find(s => s.id === Number(idServico));
        acrescimo = servicoSelecionado?.duracaoMinutos || (tipoAvaliador === 'INTERNO' ? 30 : 60);
    }

    dateCalc.setMinutes(dateCalc.getMinutes() + acrescimo);
    
    const hFim = String(dateCalc.getHours()).padStart(2, '0');
    const mFim = String(dateCalc.getMinutes()).padStart(2, '0');
    setHoraFim(`${hFim}:${mFim}`);
  };

  useEffect(() => {
    if (horaInicio && !ehTarefa) handleHoraInicioChange(horaInicio);
  }, [tipoAvaliador, idServico]);

  const handleSalvar = async (e, fecharModalComAnimacao) => {
    e.preventDefault();
    setErroGlobal(null);

    const camposComErro = [];

    // Validação de Data
    if (!dataSelecionada || dataSelecionada.length !== 10) {
      camposComErro.push("dataSelecionada");
    } else {
      const dataAgendada = parseData(dataSelecionada);
      const dataHojeZerada = parseData(getDataHoje());
      if (dataAgendada < dataHojeZerada) {
        camposComErro.push("dataSelecionada");
        setErroGlobal("O evento não pode ser registado numa data passada.");
        setErros(camposComErro);
        setTimeout(() => setErros([]), 4000);
        return;
      }
    }

    if (!horaInicio) camposComErro.push("horaInicio");

    // Validações Específicas
    if (ehTarefa) {
      if (!idModeloTarefa) camposComErro.push("idModeloTarefa");
      if (idModeloTarefa === "CUSTOM" && !tarefaCustomizada.trim()) camposComErro.push("tarefaCustomizada");
      if (!idFuncionario) camposComErro.push("idFuncionario"); 
    } else {
      if (!idCliente) camposComErro.push("idCliente");
      if (!idServico) camposComErro.push("idServico");
      if (tipoAvaliador === "INTERNO" && !idFuncionario) camposComErro.push("idFuncionario");
      if (tipoAvaliador === "EXTERNO" && (!cpfPersonalExterno || cpfPersonalExterno.replace(/\D/g, '').length !== 11)) camposComErro.push("cpfPersonalExterno");
    }

    if (camposComErro.length > 0) {
      setErros(camposComErro);
      if (!erroGlobal) setErroGlobal("Por favor, preencha os campos obrigatórios em destaque.");
      setTimeout(() => setErros([]), 3000);
      return;
    }

    if (!idUnidadeAtual) return alert("Erro de Sessão: Unidade não identificada.");

    setLoading(true);
    try {
      const [dia, mes, ano] = dataSelecionada.split("/");
      const dataBackend = `${ano}-${mes}-${dia}`;
      
      const payload = ehTarefa ? {
         idUnidade: Number(idUnidadeAtual),
         idFuncionarioAtribuido: Number(idFuncionario),
         idTarefaTemplate: idModeloTarefa === "CUSTOM" ? null : Number(idModeloTarefa),
         dataPrevista: `${dataBackend}T${horaInicio}:00`,
         urgente: false
      } : {
         idUnidade: Number(idUnidadeAtual),
         idCliente: Number(idCliente),
         idServico: Number(idServico),
         dataHoraInicio: `${dataBackend}T${horaInicio}:00`,
         tipoProfissional: tipoAvaliador === "INTERNO" ? "PERSONAL_INTERNO" : "PERSONAL_EXTERNO",
         idFuncionario: tipoAvaliador === "INTERNO" ? Number(idFuncionario) : null,
         nomePersonalExterno: tipoAvaliador === "EXTERNO" ? cpfPersonalExterno : null
      };

      const url = ehTarefa ? "/tarefas-diarias/agendar" : "/agendamentos";

      await apiFetch(url, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (onSucesso) onSucesso();
      fecharModalComAnimacao();

    } catch (err) {
      const msgs = err.errors ? err.errors.map(e => e.defaultMessage).join(" | ") : 
                   err.backendErrors ? err.backendErrors.map(e => e.mensagem).join(" | ") : 
                   err.message || "Erro desconhecido ao agendar.";
      setErroGlobal(`Ação recusada: ${msgs}`);
    } finally {
      setLoading(false);
    }
  };

  const personaisDisponiveis = funcionarios.filter(f => 
    ["PERSONAL_TRAINER", "PERSONAL"].includes((f.cargo || "").toUpperCase())
  );

  return (
    <>
      <style>{`
        input:-webkit-autofill { transition: background-color 5000s ease-in-out 0s; -webkit-text-fill-color: white !important; }
        @keyframes shake-error { 0%, 100% { transform: translateX(0); } 25%, 75% { transform: translateX(-4px); } 50% { transform: translateX(4px); } }
        .shake-error { animation: shake-error 0.3s ease-in-out; border-color: #f97316 !important; }
        ::-webkit-calendar-picker-indicator { filter: invert(1); cursor: pointer; opacity: 0.6; }
      `}</style>

      <ModalLateral 
        isOpen={isOpen} 
        onClose={onClose} 
        titulo={<span className="text-white font-black uppercase italic tracking-tight">{passo === 1 ? "Agendamento" : (ehTarefa ? "Nova Tarefa" : "Novo Agendamento")}</span>} 
        subtitulo={<span className="text-white/60 font-bold uppercase tracking-widest text-[9px]">{passo === 1 ? "Selecione a categoria do evento" : "Preencha os detalhes abaixo"}</span>} 
        icone={
          <div className="relative w-full h-full flex items-center justify-center text-white">
            <Calendar size={36} className="opacity-90 stroke-[1.5]" />
          </div>
        } 
        footer={(fecharModal) => (
          passo === 1 ? (
            <button type="button" onClick={fecharModal} className="flex-1 py-6 flex justify-center items-center opacity-60 hover:opacity-100 transition-opacity w-full outline-none">
                <span className="font-black uppercase text-[11px] tracking-widest text-white">Descartar</span>
            </button>
          ) : (
            <>
              <button type="button" onClick={voltarParaPasso1} className="flex-1 py-6 flex justify-center items-center opacity-60 hover:opacity-100 transition-opacity group outline-none relative">
                  <ArrowLeft size={14} className="absolute left-6 text-white opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                  <span className="font-black uppercase text-[11px] tracking-widest text-white">Voltar</span>
              </button>
              <button type="submit" form="form-agendamento" disabled={loading} onClick={(e) => handleSalvar(e, fecharModal)} className="flex-1 py-6 flex justify-center items-center gap-2 disabled:opacity-30 hover:bg-white/5 transition-colors outline-none group border-l border-white/10">
                  {loading && <Loader2 size={14} className="animate-spin text-white" />} 
                  <span className="font-black uppercase text-[11px] tracking-widest text-white">Concluir</span>
              </button>
            </>
          )
        )}
      >
        <div className="flex flex-col gap-6 pb-6 text-white min-h-[400px]">
          
          {erroGlobal && (
             <div className="flex items-start gap-3 py-3 px-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 transition-all animate-in slide-in-from-top-2">
                <Info size={16} className="shrink-0 mt-0.5" />
                <span className="text-xs font-semibold tracking-wide leading-relaxed">{erroGlobal}</span>
             </div>
          )}

          {loadingConfig ? (
             <div className="flex flex-col items-center justify-center py-16 gap-4 opacity-50 animate-pulse">
                <Loader2 size={24} className="animate-spin text-white" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Carregando contexto...</span>
             </div>
          ) : (
             <>
               {passo === 1 && (
                 <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-right-4 duration-500 mt-2">
                    <button 
                      onClick={() => avancarParaPasso2("SERVICO")}
                      className="group relative flex items-center p-5 rounded-2xl bg-transparent border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all duration-300 overflow-hidden outline-none text-left"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mr-4 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300">
                         <ClipboardList size={18} className="text-white/70 group-hover:text-white transition-colors" />
                      </div>
                      <div className="flex flex-col">
                         <span className="text-sm font-bold text-white/90 group-hover:text-white tracking-wide transition-colors">Agendar Serviço</span>
                         <span className="text-[10px] text-white/40 group-hover:text-white/60 tracking-wider uppercase mt-0.5 transition-colors">Atendimento, avaliações ou aulas</span>
                      </div>
                    </button>

                    {!isCliente && (
                      <button 
                        onClick={() => avancarParaPasso2("TAREFA")}
                        className="group relative flex items-center p-5 rounded-2xl bg-transparent border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all duration-300 overflow-hidden outline-none text-left"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mr-4 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300">
                           <CheckCircle size={18} className="text-white/70 group-hover:text-white transition-colors" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-white/90 group-hover:text-white tracking-wide transition-colors">Atribuição de Tarefa</span>
                           <span className="text-[10px] text-white/40 group-hover:text-white/60 tracking-wider uppercase mt-0.5 transition-colors">Registar atividades internas</span>
                        </div>
                      </button>
                    )}
                 </div>
               )}

               {passo === 2 && (
                 <form id="form-agendamento" className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500 mt-2">
                    
                    {!ehTarefa && (
                      <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/10 relative">
                         <div 
                            className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-white/10 rounded-lg transition-transform duration-300 ease-out pointer-events-none"
                            style={{ transform: tipoAvaliador === 'INTERNO' ? 'translateX(0)' : 'translateX(100%)' }}
                         />
                         <button 
                           type="button" 
                           onClick={() => setTipoAvaliador("INTERNO")} 
                           className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest z-10 transition-colors ${tipoAvaliador === "INTERNO" ? "text-white" : "text-white/40 hover:text-white/70"}`}
                         >
                           Equipe Interna
                         </button>
                         <button 
                           type="button" 
                           onClick={() => setTipoAvaliador("EXTERNO")} 
                           className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest z-10 transition-colors ${tipoAvaliador === "EXTERNO" ? "text-white" : "text-white/40 hover:text-white/70"}`}
                         >
                           Personal Externo
                         </button>
                      </div>
                    )}

                    {!ehTarefa && tipoAvaliador === "INTERNO" && (
                      <Select 
                        id="idFuncionario" label="Professor / Especialista *" value={idFuncionario} onChange={setIdFuncionario} 
                        options={personaisDisponiveis.map(f => ({ value: f.idFuncionario || f.id, label: f.nomeCompleto || f.nome }))}
                        hasError={erros.includes("idFuncionario")}
                      />
                    )}

                    {!ehTarefa && tipoAvaliador === "EXTERNO" && (
                      <Input 
                        id="cpfPersonalExterno" label="CPF do Personal Externo *" mascara="cpf" value={cpfPersonalExterno} onChange={setCpfPersonalExterno}
                        hasError={erros.includes("cpfPersonalExterno")}
                      />
                    )}

                    {ehTarefa ? (
                      <>
                        <Select 
                          id="idModeloTarefa" label="Tipo de Tarefa *" value={idModeloTarefa} onChange={setIdModeloTarefa} 
                          options={modelosTarefa.map(m => ({ value: m.id, label: m.nome }))}
                          hasError={erros.includes("idModeloTarefa")}
                        />
                        {idModeloTarefa === "CUSTOM" && (
                          <div className="animate-in fade-in slide-in-from-top-2">
                             <Input id="tarefaCustomizada" label="Descrição da Tarefa *" value={tarefaCustomizada} onChange={setTarefaCustomizada} hasError={erros.includes("tarefaCustomizada")} />
                          </div>
                        )}
                        <Select 
                          id="idFuncionario" label="Responsável pela Execução *" value={idFuncionario} onChange={setIdFuncionario} 
                          options={funcionarios.map(f => ({ value: f.idFuncionario || f.id, label: f.nomeCompleto || f.nome }))}
                          hasError={erros.includes("idFuncionario")}
                        />
                      </>
                    ) : (
                      <>
                        <Select 
                          id="idServico" label="Serviço *" value={idServico} onChange={setIdServico} 
                          options={servicos.map(s => ({ value: s.id, label: s.nome }))}
                          hasError={erros.includes("idServico")}
                        />
                        {!isCliente && (
                          <Autocomplete 
                            id="idCliente" label="Aluno vinculado *" value={clienteNome} 
                            onSelect={(cli) => {
                                if (cli) { setIdCliente(cli.id || cli.idCliente); setClienteNome(cli.nomeCompleto || cli.nome); }
                                else { setIdCliente(""); setClienteNome(""); }
                            }}
                            hasError={erros.includes("idCliente")}
                          />
                        )}
                      </>
                    )}

                    <div className="flex gap-4">
                      <div className="flex-1">
                        <InputData 
                          id="dataSelecionada" label="Data *" value={dataSelecionada} onChange={setDataSelecionada} 
                          hasError={erros.includes("dataSelecionada")}
                        />
                      </div>
                      <div className="w-1/3">
                        <Input 
                          id="horaInicio" label="Início *" type="time" value={horaInicio} onChange={handleHoraInicioChange} 
                          hasError={erros.includes("horaInicio")}
                        />
                      </div>
                    </div>
                    
                    {!ehTarefa && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 flex items-center justify-between border-b border-white/10 pb-4">
                        <div className="flex flex-col">
                           <span className="text-sm font-bold text-white/60">Término Previsto</span>
                           <span className="text-[9px] font-bold uppercase tracking-widest text-white/30 mt-1">
                              {idServico 
                                ? `+${servicos.find(s => s.id === Number(idServico))?.duracaoMinutos || 30} Min`
                                : '+30 Min (Padrão)'}
                           </span>
                        </div>
                        <span className="text-lg font-black tracking-wider text-white/90">{horaFim || "--:--"}</span>
                      </div>
                    )}
                 </form>
               )}
             </>
          )}
        </div>
      </ModalLateral>
    </>
  );
}

function Input({ id, label, value, onChange, type = "text", mascara, disabled = false, hasError = false }) {
  const safeValue = value ?? "";
  const [isFocused, setIsFocused] = useState(false);
  const active = isFocused || (safeValue.toString().length > 0);

  const format = (val) => {
    if (!val || mascara !== "cpf") return val;
    let limpo = val.replace(/\D/g, "").slice(0, 11);
    return limpo.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  };

  return (
    <div className={`relative w-full border-b transition-colors ${disabled ? 'border-white/10 opacity-30 cursor-not-allowed' : hasError ? 'shake-error border-orange-500 opacity-100' : 'border-white/20 focus-within:border-white/60 hover:border-white/40 opacity-80 hover:opacity-100'}`}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? 'text-orange-500' : 'text-white'} ${active ? "-top-5 text-[9px] opacity-100" : "top-1 text-xs opacity-60"}`}>{label}</label>
      <div className="relative flex items-center">
        <input 
          type={type} value={safeValue} disabled={disabled}
          onFocus={() => !disabled && setIsFocused(true)} 
          onBlur={() => !disabled && setIsFocused(false)} 
          onChange={(e) => !disabled && onChange(format(e.target.value))} 
          className={`w-full bg-transparent outline-none text-sm font-semibold pb-2 pt-1 ${hasError ? 'text-orange-400' : 'text-white'} placeholder-white/20`} 
          style={{ colorScheme: 'dark' }}
        />
        {type === "time" && <Clock size={14} className="absolute right-0 top-1.5 text-white/40 pointer-events-none" />}
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
    let v = e.target.value.replace(/\D/g, "").slice(0, 8);
    if (v.length > 4) v = v.replace(/(\d{2})(\d{2})(\d{1,4})/, "$1/$2/$3");
    else if (v.length > 2) v = v.replace(/(\d{2})(\d{1,4})/, "$1/$2");
    onChange(v);
  };

  return (
    <div className={`relative w-full border-b transition-colors ${hasError ? 'shake-error border-orange-500 opacity-100' : 'border-white/20 focus-within:border-white/60 hover:border-white/40 opacity-80 hover:opacity-100'}`}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? 'text-orange-500' : 'text-white'} ${active ? "-top-5 text-[9px] opacity-100" : "top-1 text-xs opacity-60"}`}>{label}</label>
      <div className="relative flex items-center">
        {!usarCalendario ? (
          <input type="text" value={safeValue} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={handleTextChange} placeholder={isFocused ? "DD/MM/AAAA" : ""} className="w-full bg-transparent outline-none text-sm font-semibold pb-2 pt-1 text-white pr-8 placeholder-white/20" /> 
        ) : (
          <input type="date" value={safeValue.length === 10 ? safeValue.split("/").reverse().join("-") : ""} onFocus={() => setIsFocused(true)} onBlur={() => setIsFocused(false)} onChange={(e) => {
            if (!e.target.value) return onChange("");
            const [ano, mes, dia] = e.target.value.split("-");
            onChange(`${dia}/${mes}/${ano}`);
          }} className="w-full bg-transparent outline-none text-sm font-semibold pb-2 pt-1 pr-8 text-white [color-scheme:dark]" />
        )}
        <button type="button" onClick={() => setUsarCalendario(!usarCalendario)} className="absolute right-0 top-1 bottom-2 flex items-center text-white/40 hover:text-white/80 transition-colors outline-none">
          {usarCalendario ? <Type size={14} /> : <Calendar size={14} />}
        </button>
      </div>
    </div>
  );
}

function Select({ id, label, value, options, onChange, hasError }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const active = isOpen || Boolean(value?.toString().length);
  const selected = options.find((opt) => opt.value === value);
  
  return (
    <div className={`relative w-full border-b transition-colors z-40 ${hasError ? 'shake-error border-orange-500 opacity-100' : 'border-white/20 focus-within:border-white/60 hover:border-white/40 opacity-80 hover:opacity-100'}`} ref={dropdownRef}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? 'text-orange-500' : 'text-white'} ${active ? "-top-5 text-[9px] opacity-100" : "top-1 text-xs opacity-60"}`}>{label}</label>
      <div className="flex items-center justify-between w-full bg-transparent outline-none text-sm font-semibold cursor-pointer py-2 text-left relative" onClick={() => setIsOpen(!isOpen)}>
        <span className={`truncate pr-6 select-none ${hasError && !selected ? 'text-orange-400' : 'text-white'}`}>{selected?.label || ""}</span>
        <ChevronDown size={14} className={`transition-transform duration-300 ${hasError ? 'text-orange-400' : 'text-white'} ${isOpen ? 'rotate-180 opacity-100' : 'opacity-40'}`} />
      </div>
      
      {isOpen && (
        <ul className="absolute top-full left-0 w-full mt-2 z-50 rounded-xl shadow-2xl border border-white/10 overflow-hidden bg-neutral-900/95 backdrop-blur-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          {options.length === 0 ? (
            <li className="px-4 py-3 font-semibold text-xs text-white/40">Nenhuma opção disponível</li>
          ) : (
            options.map((opt) => (
              <li 
                key={opt.value} onClick={() => { onChange(opt.value); setIsOpen(false); }} 
                className={`px-4 py-3 font-semibold cursor-pointer transition-colors text-xs hover:bg-white/10 text-white/80 hover:text-white ${opt.value === 'CUSTOM' ? 'bg-white/5 text-blue-300 hover:text-blue-200 border-t border-white/10' : 'border-b border-white/5 last:border-0'}`}
              >
                {opt.label}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function Autocomplete({ id, label, value, onSelect, hasError }) {
  const [f, setF] = useState(false);
  const [busca, setBusca] = useState(value || "");
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const dropdownRef = useRef(null);
  const active = f || (busca.toString().length > 0);

  useEffect(() => { setBusca(value || ""); }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setF(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (busca.length < 2) { setClientes([]); return; }
    const controller = new AbortController();
    const fetchAPI = async () => {
      setCarregando(true);
      try {
        const response = await apiFetch(`/clientes?busca=${encodeURIComponent(busca)}`, { signal: controller.signal });
        const data = await response.json();
        setClientes((Array.isArray(data) ? data : (data.content || [])).slice(0, 5));
      } catch (error) {
        if (error.name !== "AbortError") console.error(error);
      } finally {
        setCarregando(false);
      }
    };
    const timeoutId = setTimeout(fetchAPI, 500);
    return () => { clearTimeout(timeoutId); controller.abort(); };
  }, [busca]);

  return (
    <div className={`relative w-full border-b transition-colors z-30 ${hasError ? 'shake-error border-orange-500 opacity-100' : 'border-white/20 focus-within:border-white/60 hover:border-white/40 opacity-80 hover:opacity-100'}`} ref={dropdownRef}>
      <label className={`absolute left-0 transition-all duration-300 pointer-events-none font-black uppercase italic tracking-tighter ${hasError ? 'text-orange-500' : 'text-white'} ${active ? "-top-5 text-[9px] opacity-100" : "top-1 text-xs opacity-60"}`}>{label}</label>
      <div className="relative flex items-center">
        <input 
          type="text" value={busca} onFocus={() => setF(true)} 
          onChange={(e) => { setBusca(e.target.value); if (e.target.value === "") onSelect(null); }} 
          className="w-full bg-transparent outline-none text-sm font-semibold pb-2 pt-1 pr-8 text-white placeholder-white/20" 
        />
        <div className="absolute right-0 top-1.5 opacity-40">
          {carregando ? <Loader2 size={14} className="animate-spin text-white" /> : <User size={14} className="text-white" />}
        </div>
      </div>
      {f && clientes.length > 0 && (
        <ul className="absolute top-full left-0 w-full mt-2 z-50 rounded-xl shadow-2xl border border-white/10 overflow-hidden bg-neutral-900/95 backdrop-blur-xl max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          {clientes.map((c) => (
            <li 
              key={c.id || c.idCliente} onClick={() => { setBusca(c.nomeCompleto || c.nome); onSelect(c); setF(false); }}
              className="px-4 py-3 cursor-pointer transition-colors text-xs border-b border-white/5 last:border-0 text-white/80 hover:text-white hover:bg-white/10 flex justify-between items-center"
            >
              <span className="font-semibold">{c.nomeCompleto || c.nome}</span>
              <span className="opacity-40 text-[9px] uppercase tracking-widest">{c.cpf || 'N/I'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}