import React, { useState, useEffect, useMemo, useCallback } from "react";
import { 
  ChevronLeft, ChevronRight, Plus, Filter, 
  LayoutGrid, List, User, ChevronDown, Loader2, AlertCircle, XCircle 
} from "lucide-react";

import agendaIcon from "../../assets/icons/agenda.png"; 
import { CONFIG_TIPOS } from "../../services/Agenda";
import VisaoMes from "./VisaoMes";
import VisaoSemana from "./VisaoSemana";
import VisaoDia from "./VisaoDia";
import CadastroAgendamento from "../../components/register/CadastroAgendamento";

const API_BASE = "/api";

const formatarTitleCase = (text) => {
    if (!text) return "";
    return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function Agenda() {
  const usuarioLogado = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("usuario")) || {}; } 
    catch { return {}; }
  }, []);

  const idUnidade = usuarioLogado.idUnidade || usuarioLogado.unidadeId || 1; 
  const isAdmin = ["DONO", "GERENTE", "LIDER_RECEPCAO", "ADMIN"].includes(String(usuarioLogado.cargo || usuarioLogado.perfilAcesso).toUpperCase());
  
  const [dataReferencia, setDataReferencia] = useState(new Date()); 
  const [vistaAtiva, setVistaAtiva] = useState(() => window.innerWidth < 1024 ? "dia" : "mes"); 
  const [layoutSemana, setLayoutSemana] = useState("lista"); 
  
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const [agendamentos, setAgendamentos] = useState([]);
  const [tarefas, setTarefas] = useState([]);
  const [listaFuncionarios, setListaFuncionarios] = useState([]);
  
  const [filtroTipo, setFiltroTipo] = useState("todos"); 
  const [filtroFuncionario, setFiltroFuncionario] = useState(null);
  const [menuFiltroFuncAberto, setMenuFiltroFuncAberto] = useState(false);
  
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoSelecionadoModal, setTipoSelecionadoModal] = useState("AULA");

  const [modalCancelamento, setModalCancelamento] = useState({ aberto: false, item: null, motivo: "" });
  const [loadingCancelamento, setLoadingCancelamento] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024 && vistaAtiva === 'mes') {
        setVistaAtiva('dia');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [vistaAtiva]);

  const buscarDadosServidor = useCallback(async () => {
    setLoading(true);
    setErro(null);
    
    try {
      const headers = {
        "Authorization": `Bearer ${usuarioLogado.token}`,
        "id-operador": String(usuarioLogado.id || 1)
      };

      const ano = dataReferencia.getFullYear();
      const mes = dataReferencia.getMonth();
      const dataInicio = new Date(ano, mes, 1, 0, 0, 0).toISOString();
      const dataFim = new Date(ano, mes + 1, 0, 23, 59, 59).toISOString();

      const rotas = [
        fetch(`${API_BASE}/agendamentos/unidade/${idUnidade}?inicio=${dataInicio}&fim=${dataFim}`, { headers }),
        fetch(`${API_BASE}/tarefas-diarias/pendentes/unidade/${idUnidade}`, { headers })
      ];

      if (isAdmin && listaFuncionarios.length === 0) {
        rotas.push(fetch(`${API_BASE}/funcionarios`, { headers }));
      }

      const respostas = await Promise.all(rotas);

      if (respostas[0].status === 403 || respostas[1].status === 403) {
        throw new Error("Sessão expirada ou sem permissão. Por favor, faça login novamente.");
      }

      if (!respostas[0].ok) throw new Error("Falha ao carregar agendamentos do servidor.");
      if (!respostas[1].ok) throw new Error("Falha ao carregar tarefas diárias do servidor.");

      const dataAgendamentos = await respostas[0].json();
      const dataTarefas = await respostas[1].json();
      
      if (isAdmin && respostas[2]) {
        if (respostas[2].status === 403) {
          console.warn("Acesso negado à lista de funcionários (403).");
        } else if (respostas[2].ok) {
          setListaFuncionarios(await respostas[2].json());
        }
      }

      const arrayAgendamentos = Array.isArray(dataAgendamentos) ? dataAgendamentos : (dataAgendamentos.content || []);
      const arrayTarefas = Array.isArray(dataTarefas) ? dataTarefas : (dataTarefas.content || []);

      const agendamentosNormalizados = arrayAgendamentos.map(a => {
        const nomeServico = a.nomeServico || "";
        const isAvaliacao = nomeServico.toLowerCase().includes("avalia");

        return {
          id: a.id,
          tipo: isAvaliacao ? "AVALIACAO" : "AULA", 
          titulo: nomeServico || "Atendimento Operacional",
          data: a.dataHoraInicio ? a.dataHoraInicio.split("T")[0] : "",
          horaInicio: a.dataHoraInicio ? a.dataHoraInicio.split("T")[1].slice(0, 5) : "00:00",
          horaFim: a.dataHoraFim ? a.dataHoraFim.split("T")[1].slice(0, 5) : "23:59",
          idFuncionario: null, 
          professor: a.profissional || "Não Atribuído",
          local: "Unidade Principal",
          aluno: a.nomeCliente || "Cliente Geral"
        };
      });

      const tarefasNormalizadas = arrayTarefas.map(t => ({
        id: `t-${t.id}`,
        tipo: "TAREFA",
        titulo: t.nomeTarefa || "Tarefa Operacional",
        data: t.dataPrevista ? t.dataPrevista.split("T")[0] : "",
        horaInicio: t.dataPrevista ? t.dataPrevista.split("T")[1].slice(0, 5) : "00:00",
        horaFim: "23:59",
        idFuncionario: t.idFuncionarioAtribuido || null,
        responsavel: t.nomeFuncionarioAtribuido || "Mural da Equipe"
      }));

      setAgendamentos(agendamentosNormalizados);
      setTarefas(tarefasNormalizadas);
    } catch (error) {
      console.error("Erro ao sincronizar dados:", error);
      setErro(error.message || "Não foi possível sincronizar a agenda neste momento.");
    } finally {
      setLoading(false);
    }
  }, [usuarioLogado.token, usuarioLogado.id, isAdmin, listaFuncionarios.length, idUnidade, dataReferencia]);

  useEffect(() => {
    if (usuarioLogado.token) {
      buscarDadosServidor();
    }
  }, [dataReferencia, buscarDadosServidor, usuarioLogado.token]);

  const abrirModalCancelamento = useCallback((item) => {
    setModalCancelamento({ aberto: true, item, motivo: "" });
  }, []);

  const executarCancelamento = async () => {
    if (!modalCancelamento.item) return;
    
    setLoadingCancelamento(true);
    try {
      const { id, tipo } = modalCancelamento.item;
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${usuarioLogado.token}`,
        "id-operador": String(usuarioLogado.id || 1)
      };
      
      const payload = { motivoCancelamento: modalCancelamento.motivo || "Cancelado pelo usuário." };
      
      let endpoint = "";
      let idLimpo = id;

      if (tipo === "TAREFA") {
        idLimpo = String(id).replace("t-", "");
        endpoint = `${API_BASE}/tarefas-diarias/${idLimpo}/cancelar`;
      } else {
        endpoint = `${API_BASE}/agendamentos/${idLimpo}/cancelar`;
      }

      const response = await fetch(endpoint, {
        method: "PATCH",
        headers,
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("Falha ao processar o cancelamento no servidor.");
      }

      setModalCancelamento({ aberto: false, item: null, motivo: "" });
      buscarDadosServidor(); 

    } catch (error) {
      alert(error.message);
    } finally {
      setLoadingCancelamento(false);
    }
  };

  const dadosFiltrados = useMemo(() => {
    const todosCompromissos = [...agendamentos, ...tarefas];
    return todosCompromissos
      .filter(c => {
        const passaTipo = filtroTipo === "todos" || c.tipo === filtroTipo;
        const passaFuncionario = !filtroFuncionario || String(c.idFuncionario) === String(filtroFuncionario);
        return passaTipo && passaFuncionario;
      })
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
  }, [agendamentos, tarefas, filtroTipo, filtroFuncionario]);

  const mudarData = (valor) => {
    const novaData = new Date(dataReferencia);
    if (vistaAtiva === "mes") novaData.setMonth(novaData.getMonth() + valor);
    else if (vistaAtiva === "semana") novaData.setDate(novaData.getDate() + (valor * 7));
    else novaData.setDate(novaData.getDate() + valor);
    setDataReferencia(novaData);
  };

  const abrirModalNovo = (tipo) => {
    setTipoSelecionadoModal(tipo);
    setModalAberto(true);
  };

  return (
    <>
      <style>{`
        .hide-scroll::-webkit-scrollbar { display: none; }
        .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        
        .visao-mes-grid-parent {
            flex: 1;
            min-height: 0;
            display: grid;
            grid-template-rows: repeat(auto-fit, minmax(0, 1fr)); 
            overflow: hidden;
        }

        .visao-mes-grid-parent > div:nth-child(7n) .modal-agenda,
        .visao-mes-grid-parent > div:nth-child(7n - 1) .modal-agenda {
            left: auto !important;
            right: 90% !important;
        }

        .visao-mes-grid-parent > div:nth-child(7n + 1) .modal-agenda,
        .visao-mes-grid-parent > div:nth-child(7n + 2) .modal-agenda {
            right: auto !important;
            left: 90% !important;
        }

        .visao-mes-grid-parent > div:nth-child(-n + 14) .modal-agenda {
            bottom: auto !important;
            top: 10% !important;
        }

        .visao-mes-grid-parent > div:nth-last-child(-n + 14) .modal-agenda {
            top: auto !important;
            bottom: 10% !important;
        }
      `}</style>

      <div className="w-full h-full font-sans flex flex-col transition-colors duration-300 bg-transparent gap-2 px-2 overflow-hidden animate-in fade-in duration-500 pb-2">
        
        <header className="flex-col lg:flex-row justify-between items-center shrink-0 mt-2 mb-1 gap-4 flex">
          <div className="flex items-center gap-4 w-full lg:w-[280px] shrink-0">
              <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                <div 
                  className="w-7 h-7 bg-[var(--bg-sidebar)]" 
                  style={{ 
                    WebkitMaskImage: `url(${agendaIcon})`, 
                    WebkitMaskSize: "contain", 
                    WebkitMaskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskImage: `url(${agendaIcon})`, 
                    maskSize: "contain",
                    maskRepeat: "no-repeat",
                    maskPosition: "center"
                  }} 
                />
              </div>
              
              <div className="flex flex-col">
                  <h1 className="text-2xl sm:text-2xl font-black italic uppercase tracking-tight leading-none text-[var(--bg-sidebar)]">
                    Agenda
                  </h1>
                  <p className="text-[10px] sm:text-[10px] font-bold uppercase tracking-widest opacity-60 mt-1 text-[var(--text-main)]">
                    Visão Modular Otimizada
                  </p>
              </div>
          </div>
          
          <button 
            onClick={() => abrirModalNovo("AULA")}
            className="w-full lg:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--bg-sidebar)] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm hover:scale-105 active:scale-95 cursor-pointer outline-none"
          >
            <Plus size={16} strokeWidth={2.5} /> Novo Agendamento
          </button>
        </header>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-2 flex flex-col xl:flex-row justify-between items-center gap-3 shrink-0 shadow-sm relative z-40 mx-1">
          
          <div className="flex items-center justify-between sm:justify-start gap-4 w-full xl:w-auto">
            <div className="flex items-center gap-1">
              <button onClick={() => mudarData(-1)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-main)] outline-none">
                <ChevronLeft size={18} strokeWidth={2.5}/>
              </button>
              <div className="flex flex-col items-center justify-center min-w-[130px] py-1 px-2">
                <span className="font-bold uppercase tracking-widest text-[10px] text-[var(--text-main)]">
                  {new Intl.DateTimeFormat('pt-BR', vistaAtiva === "mes" ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' }).format(dataReferencia)}
                </span>
              </div>
              <button onClick={() => mudarData(1)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-main)] outline-none">
                <ChevronRight size={18} strokeWidth={2.5}/>
              </button>
            </div>

            {vistaAtiva === "semana" && (
              <div className="flex items-center p-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-body)] hidden sm:flex">
                <button onClick={() => setLayoutSemana("colunas")} className={`p-1.5 rounded-md transition-colors outline-none ${layoutSemana === "colunas" ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'opacity-50 text-[var(--text-main)]'}`}><LayoutGrid size={14} /></button>
                <button onClick={() => setLayoutSemana("lista")} className={`p-1.5 rounded-md transition-colors outline-none ${layoutSemana === "lista" ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'opacity-50 text-[var(--text-main)]'}`}><List size={14} /></button>
              </div>
            )}
          </div>

          <div className="flex flex-wrap md:flex-nowrap items-center gap-2 w-full xl:w-auto justify-end">
            
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scroll w-full md:w-auto pb-1 md:pb-0">
              <Filter size={14} className="opacity-40 mr-1 shrink-0 hidden md:block text-[var(--text-main)]" />
              
              <button 
                onClick={() => setFiltroTipo("todos")} 
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border outline-none whitespace-nowrap ${filtroTipo === "todos" ? 'bg-[var(--bg-sidebar)] text-white border-transparent shadow-sm' : 'text-[var(--text-main)] bg-[var(--bg-body)] border-[var(--border-color)] hover:bg-black/5 dark:hover:bg-white/5'}`}
              >
                Todos
              </button>
              
              {Object.entries(CONFIG_TIPOS).map(([key, cfg]) => (
                <button 
                  key={key} onClick={() => setFiltroTipo(key)} 
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border outline-none whitespace-nowrap ${filtroTipo === key ? `${cfg.bg} ${cfg.cor} border-current shadow-sm` : 'text-[var(--text-main)] bg-[var(--bg-body)] border-[var(--border-color)] hover:bg-black/5 dark:hover:bg-white/5'}`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-auto min-w-[140px]">
              {isAdmin ? (
                 <div className="relative">
                    <button onClick={() => setMenuFiltroFuncAberto(!menuFiltroFuncAberto)} className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border outline-none ${filtroFuncionario ? 'bg-[var(--bg-sidebar)] text-white shadow-sm' : 'bg-[var(--bg-body)] text-[var(--text-main)] border-[var(--border-color)]'}`}>
                      <span className="truncate">{filtroFuncionario ? (listaFuncionarios.find(f => String(f.id || f.idFuncionario) === String(filtroFuncionario))?.nomeCompleto || "Filtrado") : "Toda a Equipe"}</span>
                      <ChevronDown size={14} className={`transition-transform shrink-0 ${menuFiltroFuncAberto ? 'rotate-180' : ''}`} />
                    </button>

                    {menuFiltroFuncAberto && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuFiltroFuncAberto(false)}></div>
                        <div className="absolute top-full right-0 mt-2 w-56 border border-[var(--border-color)] rounded-xl shadow-lg p-1.5 z-[150] max-h-60 overflow-y-auto custom-slim-scroll bg-[var(--bg-card)] animate-in fade-in slide-in-from-top-2">
                          <button onClick={() => { setFiltroFuncionario(null); setMenuFiltroFuncAberto(false); }} className="w-full text-left px-3 py-2 text-[9px] font-black uppercase tracking-widest text-[var(--text-main)] hover:bg-black/5 dark:hover:bg-white/5 rounded-lg mb-1 transition-colors outline-none">
                            Ver Todos
                          </button>
                          {listaFuncionarios.map(func => (
                            <button key={func.id || func.idFuncionario} onClick={() => { setFiltroFuncionario(func.id || func.idFuncionario); setMenuFiltroFuncAberto(false); }} className="w-full text-left px-3 py-2 text-[9px] font-bold tracking-widest uppercase text-[var(--text-main)] opacity-80 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg truncate transition-colors outline-none">
                              {formatarTitleCase(func.nomeCompleto || func.nome)}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                 </div>
              ) : (
                 <button onClick={() => setFiltroFuncionario(filtroFuncionario ? null : usuarioLogado.id)} className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all border outline-none ${filtroFuncionario ? 'bg-[var(--bg-sidebar)] text-white shadow-sm' : 'bg-[var(--bg-body)] text-[var(--text-main)] border-[var(--border-color)]'}`}>
                   Meus Registros
                 </button>
              )}
            </div>

            <div className="flex p-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-body)] w-full md:w-auto justify-center shrink-0">
              {[ 
                { id: "mes", label: "Mês", hideMobile: true }, 
                { id: "semana", label: "Semana", hideMobile: false }, 
                { id: "dia", label: "Dia", hideMobile: false } 
              ].map(v => (
                <button 
                  key={v.id} 
                  onClick={() => setVistaAtiva(v.id)} 
                  className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all outline-none 
                    ${v.hideMobile ? 'hidden lg:block' : 'block'} 
                    ${vistaAtiva === v.id ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' : 'opacity-60 text-[var(--text-main)] hover:opacity-100'}
                  `}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 w-full relative min-h-0 z-10 flex flex-col overflow-hidden mx-1">
          
          {erro && !loading && (
            <div className="absolute inset-0 bg-[var(--bg-body)] z-40 flex flex-col items-center justify-center rounded-2xl border border-[var(--border-color)] p-6 text-center animate-in fade-in duration-300">
              <AlertCircle size={48} className="text-red-500 mb-4 opacity-80" />
              <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)] mb-2">Sincronização Interrompida</h3>
              <p className="text-xs font-bold text-[var(--text-main)] opacity-70 max-w-md mb-6">{erro}</p>
              <button 
                onClick={buscarDadosServidor}
                className="px-6 py-2.5 bg-[var(--bg-sidebar)] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-sm outline-none"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {loading ? (
            <div className="absolute inset-0 bg-[var(--bg-card)]/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-2xl">
              <Loader2 className="animate-spin mb-3 text-[var(--bg-sidebar)]" size={36} />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 text-[var(--text-main)]">Sincronizando...</p>
            </div>
          ) : (
            !erro && (
              <div className="w-full h-full flex flex-col overflow-hidden">
                {vistaAtiva === "mes" && <VisaoMes dataReferencia={dataReferencia} dadosFiltrados={dadosFiltrados} setDataReferencia={setDataReferencia} setVistaAtiva={setVistaAtiva} onCancelar={abrirModalCancelamento} />}
                {vistaAtiva === "semana" && <VisaoSemana dataReferencia={dataReferencia} dadosFiltrados={dadosFiltrados} layoutSemana={layoutSemana} setDataReferencia={setDataReferencia} setVistaAtiva={setVistaAtiva} onCancelar={abrirModalCancelamento} />}
                {vistaAtiva === "dia" && <VisaoDia dataReferencia={dataReferencia} dadosFiltrados={dadosFiltrados} onCancelar={abrirModalCancelamento} />}
              </div>
            )
          )}
        </div>

        {/* Modal de Cancelamento com Botão Verde */}
        {modalCancelamento.aberto && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
             <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col gap-4">
                
                <div className="flex items-center gap-3 border-b border-[var(--border-color)] pb-3">
                  <XCircle size={24} className="text-emerald-500" />
                  <h2 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">Cancelar Registro</h2>
                </div>
                
                <p className="text-xs font-bold text-[var(--text-main)] opacity-70">
                  Deseja realmente cancelar <strong>{modalCancelamento.item?.titulo}</strong>? Esta ação informará o sistema e os envolvidos.
                </p>
                
                <textarea 
                   value={modalCancelamento.motivo}
                   onChange={(e) => setModalCancelamento(prev => ({ ...prev, motivo: e.target.value }))}
                   placeholder="Informe o motivo do cancelamento (opcional)..."
                   className="w-full bg-[var(--bg-body)] border border-[var(--border-color)] rounded-xl p-4 text-sm font-medium text-[var(--text-main)] outline-none min-h-[100px] resize-none focus:border-emerald-500 transition-colors"
                />
                
                <div className="flex gap-3 mt-2">
                  <button 
                    onClick={() => setModalCancelamento({ aberto: false, item: null, motivo: "" })}
                    disabled={loadingCancelamento}
                    className="flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-black/5 dark:bg-white/5 text-[var(--text-main)] hover:bg-black/10 dark:hover:bg-white/10 transition-colors outline-none"
                  >
                    Voltar
                  </button>
                  <button 
                    onClick={executarCancelamento}
                    disabled={loadingCancelamento}
                    className="flex-1 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-emerald-500 text-white shadow-md hover:bg-emerald-600 transition-colors outline-none flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {loadingCancelamento ? <Loader2 size={16} className="animate-spin" /> : "Confirmar"}
                  </button>
                </div>
             </div>
          </div>
        )}

        <CadastroAgendamento
          isOpen={modalAberto}
          onClose={() => setModalAberto(false)}
          onSucesso={() => {
            setModalAberto(false);
            buscarDadosServidor();
          }}
          unidadeId={idUnidade}
          tipoRegistro={tipoSelecionadoModal} 
        />
      </div>
    </>
  );
}