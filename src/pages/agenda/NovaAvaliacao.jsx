import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { 
  ArrowLeft, Save, Loader2, FileText, Activity, Layers, User, 
  CalendarCheck, Search, AlertCircle, ChevronRight, DollarSign, ChevronDown
} from "lucide-react";

const API_BASE = "/api";

const InputField = ({ label, required, ...props }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 text-[var(--text-main)]">
      {label} {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input 
      className="w-full px-4 py-3 rounded-xl border font-bold text-xs bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)] shadow-sm outline-none focus:border-[var(--bg-sidebar)] transition-colors placeholder:opacity-30 disabled:opacity-50 disabled:cursor-not-allowed"
      {...props}
    />
  </div>
);

const TextAreaField = ({ label, ...props }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[10px] font-black uppercase tracking-widest opacity-60 text-[var(--text-main)]">{label}</label>
    <textarea 
      rows={3}
      className="w-full px-4 py-3 rounded-xl border font-bold text-xs bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)] shadow-sm outline-none resize-none focus:border-[var(--bg-sidebar)] transition-colors placeholder:opacity-30"
      {...props}
    />
  </div>
);

function FiltroDropdown({ label, opcoes, isOpen, onToggle, onSelect, icon: Icon = ChevronDown }) {
    return (
        <div className="relative flex-1 sm:flex-none">
            <button 
              type="button"
              onClick={onToggle} 
              className="w-full sm:w-[160px] h-[40px] rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:opacity-90 transition-all shadow-md active:scale-95 text-white outline-none shrink-0"
              style={{ backgroundColor: 'var(--bg-sidebar)' }}
            >
                <span className="truncate px-2">{label}</span>
                {Icon && <Icon size={12} className={`transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />}
            </button>
            {isOpen && (
                <div className="absolute top-12 left-0 sm:right-0 sm:left-auto w-full sm:w-[160px] rounded-xl shadow-2xl border z-[100] overflow-hidden animate-in slide-in-from-top-2 duration-200" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    <div onClick={() => onSelect(null)} className="px-5 py-2.5 text-[10px] font-black uppercase cursor-pointer hover:bg-black/5" style={{ color: 'var(--text-main)' }}>TODOS</div>
                    {opcoes.filter(op => op !== "TODOS" && op !== "TUDO").map(op => (
                        <div key={op} onClick={() => onSelect(op)} className="px-5 py-2.5 text-[10px] font-black uppercase cursor-pointer hover:bg-black/5 border-t truncate" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }} title={op}>
                           {op}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function NovaAvaliacao() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  
  const idAgendamentoContexto = location.state?.idAgendamento || null;

  const usuarioLogado = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("usuario")) || {}; } 
    catch { return {}; }
  }, []);
  
  const idUnidade = usuarioLogado.idUnidade || usuarioLogado.unidadeId || 1;
  const idOperador = usuarioLogado.id || usuarioLogado.idFuncionario || 1;

  const [passo, setPasso] = useState((id || idAgendamentoContexto) ? "form" : "selecao");
  const [agendamentoLocal, setAgendamentoLocal] = useState(null); 
  const idAgendamentoFinal = idAgendamentoContexto || agendamentoLocal?.id;

  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState("geral");

  const [loadingPendentes, setLoadingPendentes] = useState(false);
  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState([]);
  const [termoBusca, setTermoBusca] = useState("");
  
  const [filtroTurno, setFiltroTurno] = useState("TODOS"); 
  const [filtroData, setFiltroData] = useState("TODOS");   
  
  const [menuTurnoAberto, setMenuTurnoAberto] = useState(false);
  const [menuDataAberto, setMenuDataAberto] = useState(false);

  const [form, setForm] = useState({
    idCliente: "", nomeCliente: "", peso: "", altura: "",
    historicoMedico: "", objetivos: "", observacoes: "",
    peitoral: "", abdominal: "", coxa: "", tricepital: "", subescapular: "", suprailiaca: "",
    torax: "", bracoDireito: "", bracoEsquerdo: "", cintura: "", quadril: "", coxaDireita: "", coxaEsquerda: ""
  });

  const getHeaders = useCallback(() => {
    const tokenStr = usuarioLogado?.token ? `Bearer ${usuarioLogado.token}` : "";
    return {
      "Content-Type": "application/json",
      ...(tokenStr && { "Authorization": tokenStr }),
      "id-operador": String(idOperador)
    };
  }, [usuarioLogado, idOperador]);

  useEffect(() => {
    if (passo !== "selecao") return;

    const buscarPendentes = async () => {
      setLoadingPendentes(true);
      try {
        const hoje = new Date();
        const inicio = new Date(hoje); inicio.setDate(hoje.getDate() - 3);
        const fim = new Date(hoje); fim.setDate(hoje.getDate() + 20);

        const res = await fetch(`${API_BASE}/agendamentos/unidade/${idUnidade}?inicio=${inicio.toISOString()}&fim=${fim.toISOString()}`, { 
          headers: getHeaders() 
        });

        if (res.ok) {
          const dados = await res.json();
          const lista = Array.isArray(dados) ? dados : (dados.content || []);
          const filtrados = lista.filter(a => 
            (a.nomeServico || "").toLowerCase().includes("avalia") && 
            a.status !== "CANCELADO" && 
            a.status !== "CONCLUIDO"
          );
          filtrados.sort((a, b) => new Date(a.dataHoraInicio) - new Date(b.dataHoraInicio));
          setAvaliacoesPendentes(filtrados);
        } else if (res.status === 403) {
            alert("Sessão expirada ou sem permissão. Faça o login novamente.");
        }
      } catch (err) {
        console.error("Erro ao buscar avaliações pendentes:", err);
      } finally {
        setLoadingPendentes(false);
      }
    };

    buscarPendentes();
  }, [passo, idUnidade, getHeaders]);

  const selecionarAgendamento = (agendamento) => {
    setAgendamentoLocal(agendamento);
    setForm(prev => ({
      ...prev,
      nomeCliente: agendamento.nomeCliente 
    }));
    setPasso("form");
  };

  useEffect(() => {
    const inicializarContexto = async () => {
      if (passo !== "form") return;
      setLoading(true);
      try {
        if (agendamentoLocal || idAgendamentoContexto) {
            const resClientes = await fetch(`${API_BASE}/clientes`, { headers: getHeaders() });
            if (resClientes.ok) {
                const clientes = await resClientes.json();
                const nomeAlvo = agendamentoLocal?.nomeCliente || form.nomeCliente;
                const clienteEncontrado = clientes.find(c => c.nomeCompleto === nomeAlvo);
                
                if (clienteEncontrado) {
                    setForm(prev => ({
                        ...prev,
                        idCliente: clienteEncontrado.idCliente,
                        nomeCliente: clienteEncontrado.nomeCompleto
                    }));
                }
            }
        } 
        else if (id) {
            const resCli = await fetch(`${API_BASE}/clientes/${id}`, { headers: getHeaders() });
            if (resCli.ok) {
                const dadosCli = await resCli.json();
                setForm(prev => ({ 
                    ...prev, 
                    idCliente: dadosCli.idCliente, 
                    nomeCliente: dadosCli.nomeCompleto 
                }));
            }
        }
      } catch (err) {
        console.error("Erro ao carregar contexto:", err);
      } finally {
        setLoading(false);
      }
    };

    if (usuarioLogado.token && passo === "form") inicializarContexto();
  }, [id, idAgendamentoContexto, agendamentoLocal, passo, getHeaders, usuarioLogado.token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleKeyDown = useCallback((e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const formElements = Array.from(e.currentTarget.form.elements);
      const index = formElements.indexOf(e.target);
      if (index > -1 && formElements[index + 1]) {
        formElements[index + 1].focus();
      }
    }
  }, []);

  const parseNum = (val) => (val === "" || val === null || val === undefined) ? null : Number(val);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.idCliente) return alert("Erro crítico: O ID do Cliente não foi localizado no cruzamento de dados.");
    if (!form.peso || !form.altura) return alert("Peso e Altura são obrigatórios.");

    setSalvando(true);
    try {
      const temAnamnese = form.historicoMedico || form.objetivos;
      const temMedidas = form.torax || form.cintura || form.quadril || form.bracoDireito || form.bracoEsquerdo || form.coxaDireita || form.coxaEsquerda;
      const temDobras = form.peitoral || form.abdominal || form.coxa || form.tricepital || form.subescapular || form.suprailiaca;

      const payload = {
        idCliente: Number(form.idCliente),
        idFuncionarioAvaliador: Number(idOperador),
        peso: parseNum(form.peso),
        altura: parseNum(form.altura),
        objetivoPrincipal: form.objetivos || null,
        observacoes: form.observacoes || null,
        protocoloDobras: "POLLOCK_3", 
        
        ...(temAnamnese && {
            anamnese: {
                historicoDoencas: form.historicoMedico || null,
            }
        }),
        
        ...(temMedidas && {
            medidas: {
                torax: parseNum(form.torax),
                cintura: parseNum(form.cintura),
                abdomen: null,
                quadril: parseNum(form.quadril),
                bracoDireito: parseNum(form.bracoDireito),
                bracoEsquerdo: parseNum(form.bracoEsquerdo),
                coxaDireita: parseNum(form.coxaDireita),
                coxaEsquerda: parseNum(form.coxaEsquerda)
            }
        }),
        
        ...(temDobras && {
            dobras: {
                peitoral: parseNum(form.peitoral),
                abdominal: parseNum(form.abdominal),
                coxa: parseNum(form.coxa),
                triceps: parseNum(form.tricepital), 
                subescapular: parseNum(form.subescapular),
                suprailiaca: parseNum(form.suprailiaca)
            }
        })
      };

      const res = await fetch(`${API_BASE}/avaliacoes`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (idAgendamentoFinal) {
          await fetch(`${API_BASE}/agendamentos/${idAgendamentoFinal}/concluir`, {
            method: "PATCH",
            headers: getHeaders(),
          });
        }
        navigate("/avaliacoes");
      } else {
        const errorData = await res.json();
        const serverMessage = Array.isArray(errorData.errors) && errorData.errors.length > 0 
                                ? errorData.errors[0].mensagem 
                                : errorData.message;
        alert(`Erro ao salvar: ${serverMessage || "Verifique se você digitou algum dado inválido."}`);
      }
    } catch (err) {
      console.error(err);
      alert("Falha de conexão com o servidor.");
    } finally {
      setSalvando(false);
    }
  };

  const agendamentosFiltrados = useMemo(() => {
    const hojeData = new Date();
    hojeData.setHours(0,0,0,0);
    
    const amanhaData = new Date(hojeData);
    amanhaData.setDate(hojeData.getDate() + 1);

    const domingoSemanaAtual = new Date(hojeData);
    domingoSemanaAtual.setDate(hojeData.getDate() - hojeData.getDay());
    const sabadoSemanaAtual = new Date(domingoSemanaAtual);
    sabadoSemanaAtual.setDate(domingoSemanaAtual.getDate() + 6);

    const domingoProxSemana = new Date(sabadoSemanaAtual);
    domingoProxSemana.setDate(sabadoSemanaAtual.getDate() + 1);
    const sabadoProxSemana = new Date(domingoProxSemana);
    sabadoProxSemana.setDate(domingoProxSemana.getDate() + 6);

    return avaliacoesPendentes.filter(a => {
      if (termoBusca && !(a.nomeCliente || "").toLowerCase().includes(termoBusca.toLowerCase())) return false;

      const dataObj = new Date(a.dataHoraInicio);
      const hora = dataObj.getHours();
      
      const dataComparativa = new Date(dataObj);
      dataComparativa.setHours(0,0,0,0);

      if (filtroTurno === "MANHA" && (hora < 5 || hora >= 12)) return false;
      if (filtroTurno === "TARDE" && (hora < 12 || hora >= 18)) return false;
      if (filtroTurno === "NOITE" && (hora < 18)) return false;

      if (filtroData === "HOJE" && dataComparativa.getTime() !== hojeData.getTime()) return false;
      if (filtroData === "AMANHA" && dataComparativa.getTime() !== amanhaData.getTime()) return false;
      if (filtroData === "SEMANA" && (dataComparativa < domingoSemanaAtual || dataComparativa > sabadoSemanaAtual)) return false;
      if (filtroData === "PROXIMA" && (dataComparativa < domingoProxSemana || dataComparativa > sabadoProxSemana)) return false;

      return true;
    });
  }, [avaliacoesPendentes, termoBusca, filtroTurno, filtroData]);

  const turnosOptions = [
    { id: "TODOS", label: "Todos os turnos" },
    { id: "MANHA", label: "Manhã" },
    { id: "TARDE", label: "Tarde" },
    { id: "NOITE", label: "Noite" }
  ];

  const datasOptions = [
    { id: "TODOS", label: "Todas as datas" },
    { id: "HOJE", label: "Hoje" },
    { id: "AMANHA", label: "Amanhã" },
    { id: "SEMANA", label: "Esta Semana" },
    { id: "PROXIMA", label: "Próxima Sem." }
  ];

  return (
    <div className="w-full h-full font-sans flex flex-col transition-colors duration-300 bg-transparent gap-6 p-1 pb-4 animate-in fade-in duration-500">
      
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 w-full shrink-0 mt-4 bg-transparent">
        <div className="flex items-center gap-4 shrink-0">
          <button onClick={() => {
            if (passo === "form" && !idAgendamentoContexto && !id) setPasso("selecao");
            else navigate(-1);
          }} className="p-1 transition-transform hover:scale-110 opacity-60 hover:opacity-100 text-[var(--text-main)]">
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div className="flex flex-col">
            <h1 className="text-2xl font-black italic uppercase tracking-tight leading-none text-[var(--bg-sidebar)]">
              Nova Avaliação
            </h1>
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest opacity-60 mt-1 whitespace-nowrap text-[var(--text-main)]">
              {passo === "selecao" ? "Passo 1: Selecionar Agendamento" : "Passo 2: Preencher Dados Corporais"}
            </p>
          </div>
        </div>

        {passo === "selecao" && (
            <>
                <div className="w-full xl:max-w-md 2xl:max-w-xl flex-1">
                    <div className="relative w-full">
                        <input 
                          type="text" 
                          placeholder="Pesquisar por aluno agendado..." 
                          value={termoBusca} 
                          onChange={e => setTermoBusca(e.target.value)} 
                          className="w-full pl-12 pr-6 py-2.5 rounded-2xl border text-sm font-bold shadow-sm transition-colors focus:border-gray-400 outline-none placeholder:normal-case bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)]" 
                        />
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 transition-opacity text-[var(--text-main)]" />
                    </div>
                </div>

                <div className="flex flex-wrap sm:flex-nowrap items-center justify-start xl:justify-end gap-3 shrink-0 w-full xl:w-auto">
                    <FiltroDropdown 
                        label={filtroTurno === "TODOS" ? "TURNO" : turnosOptions.find(t => t.id === filtroTurno)?.label} 
                        opcoes={turnosOptions.map(t => t.label)} 
                        isOpen={menuTurnoAberto}
                        onToggle={() => { setMenuTurnoAberto(!menuTurnoAberto); setMenuDataAberto(false); }}
                        onSelect={(v) => { 
                            const idStr = turnosOptions.find(t => t.label === v)?.id || "TODOS";
                            setFiltroTurno(idStr); 
                            setMenuTurnoAberto(false); 
                        }}
                    />
                    <FiltroDropdown 
                        label={filtroData === "TODOS" ? "DATA" : datasOptions.find(d => d.id === filtroData)?.label} 
                        opcoes={datasOptions.map(d => d.label)} 
                        isOpen={menuDataAberto}
                        onToggle={() => { setMenuDataAberto(!menuDataAberto); setMenuTurnoAberto(false); }}
                        onSelect={(v) => { 
                            const idStr = datasOptions.find(d => d.label === v)?.id || "TODOS";
                            setFiltroData(idStr); 
                            setMenuDataAberto(false); 
                        }}
                    />
                </div>
            </>
        )}
      </header>

      {passo === "selecao" && (
        <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-300">
          <div className="flex flex-col gap-4 overflow-y-auto custom-slim-scroll pb-10 mt-2">
            <div className="flex items-center gap-2 mb-2">
              <CalendarCheck size={16} className="text-[var(--text-main)] opacity-50" />
              <h2 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] opacity-60">
                Avaliações Agendadas Pendentes
              </h2>
            </div>

            {loadingPendentes ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin mb-3 text-[var(--bg-sidebar)]" size={32} />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--text-main)]">Buscando agenda...</span>
              </div>
            ) : agendamentosFiltrados.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center border border-dashed border-[var(--border-color)] rounded-[24px] bg-[var(--bg-card)]/50">
                <AlertCircle size={36} className="text-[var(--text-main)] opacity-20 mb-4" />
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-main)] opacity-40">
                  Nenhuma avaliação física encontrada
                </span>
                <span className="text-[9px] font-bold text-[var(--text-main)] opacity-30 mt-2 text-center max-w-xs">
                  Modifique os filtros acima ou agende uma nova avaliação primeiro.
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {agendamentosFiltrados.map((ag) => {
                  const dataFormato = new Date(ag.dataHoraInicio).toLocaleDateString('pt-BR');
                  const horaFormato = new Date(ag.dataHoraInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  
                  const isPendentePagamento = ag.status === "PENDENTE_APROVACAO_FINANCEIRA";
                  const corBordaLateral = isPendentePagamento ? "border-l-red-500" : "border-l-[var(--bg-sidebar)]";
                  const corTag = isPendentePagamento ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-[var(--bg-sidebar)]/10 text-[var(--bg-sidebar)] border border-[var(--bg-sidebar)]/20";
                  const textoTag = isPendentePagamento ? "A Cobrar" : "Liberado";
                  const valorEval = ag.valorTotal || ag.precoBase || ag.valor || 0;

                  return (
                    <button 
                      key={ag.id}
                      onClick={() => selecionarAgendamento(ag)}
                      className={`group flex flex-col items-start p-5 bg-[var(--bg-card)] border-y border-r border-[var(--border-color)] border-l-[4px] ${corBordaLateral} rounded-2xl transition-all outline-none text-left shadow-sm hover:shadow-md hover:-translate-y-1 relative overflow-hidden`}
                    >
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-[var(--bg-sidebar)]">
                         <ChevronRight size={24} />
                      </div>

                      <div className="flex w-full items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded-md bg-[var(--bg-sidebar)] text-white text-[9px] font-black uppercase tracking-widest">
                            {dataFormato}
                          </span>
                          <span className="text-[10px] font-black tracking-widest text-[var(--text-main)] opacity-60">
                            às {horaFormato}
                          </span>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-md ${corTag}`}>
                          {isPendentePagamento && <DollarSign size={10} />}
                          <span className="text-[9px] font-black uppercase tracking-widest">{textoTag}</span>
                        </div>
                      </div>
                      
                      <h3 className="font-black text-sm text-[var(--text-main)] tracking-tight mb-1 line-clamp-1 pr-6">
                        {ag.nomeCliente || "Cliente Não Identificado"}
                      </h3>
                      
                      <div className="flex items-center justify-between w-full mt-1">
                        <p className="text-[10px] font-bold text-[var(--text-main)] opacity-50 uppercase tracking-widest line-clamp-1">
                          {ag.nomeServico}
                        </p>
                        <span className="font-black text-[11px] text-[var(--text-main)] opacity-80 pr-6">
                          R$ {Number(valorEval).toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      {isPendentePagamento && ag.mensagemAviso && (
                        <p className="text-[9px] font-bold text-red-500/80 leading-snug line-clamp-2 pr-6 mt-3 pt-2 border-t border-red-500/10">
                          {ag.mensagemAviso}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {passo === "form" && (
        <>
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center rounded-[24px] border bg-[var(--bg-card)] shadow-sm border-[var(--border-color)]">
              <Loader2 className="animate-spin mb-2 text-[var(--bg-sidebar)]" size={32} />
              <p className="text-[10px] font-black uppercase opacity-40 tracking-widest text-[var(--text-main)]">Cruzando dados e carregando ficha...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-right-4 duration-300">
              
              <nav className="flex gap-1 overflow-x-auto no-scrollbar px-4 pt-2 border-b border-[var(--border-color)] shrink-0">
                {[
                  { id: "geral", label: "Dados Gerais", icone: User },
                  { id: "anamnese", label: "Anamnese", icone: FileText },
                  { id: "dobras", label: "Dobras", icone: Layers },
                  { id: "perimetros", label: "Perímetros", icone: Activity }
                ].map(tab => (
                  <button
                    key={tab.id} type="button" onClick={() => setAbaAtiva(tab.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-t-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap outline-none relative translate-y-[1px] border border-b-0 ${
                      abaAtiva === tab.id 
                      ? "bg-transparent border-[var(--border-color)] text-[var(--bg-sidebar)] z-10" 
                      : "bg-black/5 dark:bg-white/5 border-transparent text-[var(--text-main)] opacity-50 hover:opacity-100"
                    }`}
                  >
                    <tab.icone size={14} /> {tab.label}
                  </button>
                ))}
              </nav>

              <div className="flex-1 overflow-y-auto custom-slim-scroll py-6 px-2">
                
                {abaAtiva === "geral" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                    <div className="md:col-span-2">
                        <InputField label="Aluno / Cliente" name="nomeCliente" value={form.nomeCliente} onChange={handleChange} disabled />
                    </div>
                    <InputField label="Peso Atual (kg)" type="number" step="0.01" name="peso" value={form.peso} onChange={handleChange} onKeyDown={handleKeyDown} required placeholder="00.00" />
                    <InputField label="Altura (m)" type="number" step="0.01" name="altura" value={form.altura} onChange={handleChange} onKeyDown={handleKeyDown} required placeholder="0.00" />
                  </div>
                )}

                {abaAtiva === "anamnese" && (
                  <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                    <TextAreaField label="Histórico Médico / Restrições" name="historicoMedico" value={form.historicoMedico} onChange={handleChange} placeholder="Patologias, lesões, cirurgias ou uso de medicamentos..." />
                    <TextAreaField label="Objetivos Principais" name="objetivos" value={form.objetivos} onChange={handleChange} placeholder="Emagrecimento, hipertrofia, performance, condicionamento..." />
                  </div>
                )}

                {abaAtiva === "dobras" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
                    {[
                      { name: "peitoral", label: "Peitoral (mm)" },
                      { name: "abdominal", label: "Abdominal (mm)" },
                      { name: "coxa", label: "Coxa (mm)" },
                      { name: "tricepital", label: "Tricipital (mm)" },
                      { name: "subescapular", label: "Subescapular (mm)" },
                      { name: "suprailiaca", label: "Suprailíaca (mm)" }
                    ].map(dobra => (
                      <InputField key={dobra.name} label={dobra.label} type="number" name={dobra.name} value={form[dobra.name]} onChange={handleChange} onKeyDown={handleKeyDown} placeholder="0.0" />
                    ))}
                  </div>
                )}

                {abaAtiva === "perimetros" && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
                    {[
                      { name: "torax", label: "Tórax (cm)" },
                      { name: "bracoDireito", label: "Braço Direito (cm)" },
                      { name: "bracoEsquerdo", label: "Braço Esquerdo (cm)" },
                      { name: "cintura", label: "Cintura (cm)" },
                      { name: "quadril", label: "Quadril (cm)" },
                      { name: "coxaDireita", label: "Coxa Direita (cm)" },
                      { name: "coxaEsquerda", label: "Coxa Esquerda (cm)" }
                    ].map(perimetro => (
                      <InputField key={perimetro.name} label={perimetro.label} type="number" name={perimetro.name} value={form[perimetro.name]} onChange={handleChange} onKeyDown={handleKeyDown} placeholder="0.0" />
                    ))}
                  </div>
                )}

              </div>

              <footer className="flex justify-end gap-3 shrink-0 pt-4 border-t border-[var(--border-color)]">
                <button type="submit" disabled={salvando} className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 outline-none" style={{ backgroundColor: "var(--bg-sidebar)" }}>
                  {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {salvando ? "Salvando..." : "Salvar Avaliação"}
                </button>
              </footer>

            </form>
          )}
        </>
      )}
    </div>
  );
}