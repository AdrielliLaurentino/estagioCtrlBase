import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Loader2, Activity, ChevronDown, Printer, MessageCircle } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import TabelaBase from "../../components/common/TabelaBase"; 
import avaliacaoIcon from "../../assets/icons/avaliacao.png"; 
import { gerarPdfAvaliacaoFisica } from "../../utils/gerarPdfAvaliacao";

const API_BASE = "/api";

export default function AvaliacaoFisicaLista() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  const [busca, setBusca] = useState("");
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [dadosNegocio, setDadosNegocio] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtroPeriodo, setFiltroPeriodo] = useState("TUDO");
  const [filtroAvaliador, setFiltroAvaliador] = useState("TODOS");
  const [menuAberto, setMenuAberto] = useState(null);

  const usuarioLogado = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("usuario")) || {}; } 
    catch { return {}; }
  }, []);

  const buscarDadosIniciais = useCallback(async () => {
    try {
      setLoading(true);
      const headers = { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${usuarioLogado.token}`,
        "id-operador": String(usuarioLogado.id || usuarioLogado.idFuncionario || 1)
      };

      const resNegocio = await fetch(`${API_BASE}/unidades/dados-negocio`, { headers });
      if (resNegocio.ok) setDadosNegocio(await resNegocio.json());

      const resFunc = await fetch(`${API_BASE}/funcionarios`, { headers });
      if (resFunc.ok) {
         const dataFunc = await resFunc.json();
         setFuncionarios(dataFunc);
      }

      const resClientes = await fetch(`${API_BASE}/clientes`, { headers });
      const clientes = resClientes.ok ? await resClientes.json() : [];

      const fetchAvaliacoes = clientes.map(cliente => 
        fetch(`${API_BASE}/avaliacoes/cliente/${cliente.idCliente}`, { headers })
            .then(res => res.ok ? res.json() : [])
            .catch(() => []) 
      );

      const resultadosMatriz = await Promise.all(fetchAvaliacoes);
      const listaRaw = resultadosMatriz.flat();

      const ano = new Date().getFullYear();
      const resAgend = await fetch(`${API_BASE}/agendamentos/unidade/${usuarioLogado.idUnidade || usuarioLogado.unidadeId || 1}?inicio=${ano}-01-01T00:00:00&fim=${ano}-12-31T23:59:59`, { headers });
      const listaAgendamentos = resAgend.ok ? await resAgend.json() : [];
      setAgendamentos(listaAgendamentos);

      const listaNormalizada = listaRaw.map(av => {
        const agendamento = listaAgendamentos.find(a => a.nomeCliente === (av.nomeCliente || av.cliente?.nomeCompleto));
        
        return {
          ...av,
          idAvaliacao: av.idAvaliacao || av.id,
          nomeCliente: av.nomeCliente || av.cliente?.nomeCompleto || "NÃO INFORMADO",
          nomeAvaliador: av.nomeAvaliador || av.avaliador?.nomeCompleto || "SISTEMA",
          professorAgendado: agendamento?.profissional || "N/A",
          dataAgendada: agendamento?.dataHoraInicio || null,
          dataRegistro: av.dataAvaliacao || av.data_avaliacao,
          objetivo: av.objetivoPrincipal || av.objetivo_principal || "NÃO DEFINIDO"
        };
      });

      listaNormalizada.sort((a, b) => new Date(b.dataRegistro) - new Date(a.dataRegistro));
      setAvaliacoes(listaNormalizada);
      
    } catch (error) {
      setAvaliacoes([]); 
    } finally {
      setLoading(false);
    }
  }, [usuarioLogado]);

  useEffect(() => { 
    if (usuarioLogado.token) buscarDadosIniciais(); 
  }, [buscarDadosIniciais, usuarioLogado.token]);

  const dadosFiltrados = useMemo(() => {
    return avaliacoes.filter(av => {
      const nome = (av.nomeCliente || "").toLowerCase();
      const matchBusca = nome.includes(busca.toLowerCase());

      const matchAvaliador = filtroAvaliador === "TODOS" || (av.nomeAvaliador && av.nomeAvaliador.toUpperCase() === filtroAvaliador);

      let matchPeriodo = true;
      if (av.dataRegistro && filtroPeriodo !== "TUDO") {
          const dataAv = new Date(av.dataRegistro);
          const hoje = new Date();
          
          if (filtroPeriodo === "HOJE") {
              matchPeriodo = dataAv.toDateString() === hoje.toDateString();
          } else if (filtroPeriodo === "ESTA SEMANA") {
              const inicioSemana = new Date(hoje.setDate(hoje.getDate() - hoje.getDay()));
              matchPeriodo = dataAv >= inicioSemana;
          } else if (filtroPeriodo === "ESTE MÊS") {
              matchPeriodo = dataAv.getMonth() === hoje.getMonth() && dataAv.getFullYear() === hoje.getFullYear();
          }
      }

      return matchBusca && matchAvaliador && matchPeriodo;
    });
  }, [avaliacoes, busca, filtroAvaliador, filtroPeriodo]);

  const handleExportarPDF = (e, av) => {
    e.stopPropagation();
    const historicoCliente = avaliacoes.filter(a => a.nomeCliente === av.nomeCliente);
    const indexAtual = historicoCliente.findIndex(a => a.idAvaliacao === av.idAvaliacao);
    const avaliacaoAnterior = historicoCliente[indexAtual + 1] || null;

    gerarPdfAvaliacaoFisica({
      avaliacao: av,
      avaliacaoAnterior,
      dadosNegocio,
      usuarioLogado,
      logoUrl: window.location.origin + "/logo.png" 
    });
  };

  const handleWhatsApp = (e, av) => {
    e.stopPropagation();
    const dataFormatada = av.dataRegistro ? new Date(av.dataRegistro).toLocaleDateString('pt-BR') : '--/--/----';
    const peso = av.peso ? `${av.peso} kg` : '--';
    const gordura = av.percentualGordura ? `${av.percentualGordura}%` : '--';
    const magra = av.massaMagra ? `${av.massaMagra} kg` : '--';
    
    const texto = `Olá *${av.nomeCliente}*! 💪\n\nSua avaliação física do dia ${dataFormatada} foi registrada com sucesso.\n\n*Resumo dos Resultados:*\n⚖️ Peso Atual: ${peso}\n🔥 % Gordura: ${gordura}\n💪 Massa Magra: ${magra}\n\nAcesse o aplicativo para ver todos os detalhes e o gráfico de evolução!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank');
  };

  const colunas = [
    { 
      titulo: "Aluno", 
      campo: "nomeCliente",
      render: (av) => <span className="font-black text-xs uppercase text-[var(--text-main)]">{av.nomeCliente}</span>
    },
    { 
      titulo: "Data", 
      align: "center",
      render: (av) => <span className="text-[10px] font-mono font-bold opacity-70 text-[var(--text-main)]">{av.dataRegistro ? new Date(av.dataRegistro).toLocaleDateString('pt-BR') : '--/--/----'}</span>
    },
    { 
      titulo: "Professor (Avaliador)", 
      align: "center",
      render: (av) => <span className="text-[10px] font-bold opacity-60 uppercase text-[var(--text-main)]">{av.professorAgendado}</span>
    },
    { 
      titulo: "Registrado Por", 
      align: "center",
      render: (av) => <span className="text-[10px] font-bold opacity-60 uppercase text-[var(--text-main)]">{av.nomeAvaliador}</span>
    },
    { 
      titulo: "Objetivo", 
      align: "center",
      render: (av) => <span className="text-[10px] font-black uppercase" style={{ color: 'var(--bg-sidebar)' }}>{av.objetivo}</span>
    },
    {
      titulo: "Ações",
      align: "center",
      render: (av) => (
        <div className="flex items-center justify-center gap-2">
          <button 
            onClick={(e) => handleExportarPDF(e, av)}
            className="p-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors"
            title="Imprimir PDF"
          >
            <Printer size={14} className="text-[var(--text-main)] opacity-80" />
          </button>
          <button 
            onClick={(e) => handleWhatsApp(e, av)}
            className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors text-emerald-600 dark:text-emerald-400"
            title="Enviar por WhatsApp"
          >
            <MessageCircle size={14} />
          </button>
        </div>
      )
    }
  ];

  const avaliadoresDisponiveis = useMemo(() => {
     return ["TODOS", ...new Set(funcionarios.map(f => f.nomeCompleto.toUpperCase()))];
  }, [funcionarios]);

  return (
    <main className="w-full h-full font-sans flex flex-col bg-transparent gap-4 relative pb-24 lg:pb-4 px-3 lg:px-6 animate-in fade-in duration-500">
      
      <header className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 w-full shrink-0 mt-4 bg-transparent">
        
        <div className="flex items-center gap-4 shrink-0">
            <div className="w-10 h-10 shrink-0 flex items-center justify-center">
              <div 
                className="w-full h-full" 
                style={{ 
                  backgroundColor: 'var(--bg-sidebar)', 
                  WebkitMaskImage: `url(${avaliacaoIcon})`, 
                  WebkitMaskSize: "contain", 
                  WebkitMaskRepeat: "no-repeat",
                  maskImage: `url(${avaliacaoIcon})`, 
                  maskSize: "contain",
                  maskRepeat: "no-repeat"
                }} 
              />
            </div>
            <div className="flex flex-col">
                <h1 className="text-2xl font-black italic uppercase tracking-tight leading-none" style={{ color: 'var(--bg-sidebar)' }}>
                  Avaliações
                </h1>
                <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest opacity-60 mt-1 whitespace-nowrap" style={{ color: 'var(--text-main)' }}>
                  Gestão de Performance
                </p>
            </div>
        </div>

        <div className="w-full xl:max-w-md 2xl:max-w-xl flex-1">
            <div className="relative w-full">
                <input 
                  type="text" 
                  placeholder="Pesquisar por aluno..." 
                  value={busca} 
                  onChange={e => setBusca(e.target.value)} 
                  className="w-full pl-12 pr-6 py-2.5 rounded-2xl border text-sm font-bold shadow-sm transition-colors focus:border-gray-400 outline-none placeholder:normal-case" 
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', borderColor: 'var(--border-color)' }} 
                />
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 transition-opacity" style={{ color: 'var(--text-main)' }} />
            </div>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center justify-start xl:justify-end gap-3 shrink-0 w-full xl:w-auto">
            <FiltroDropdown 
                label={filtroPeriodo === "TUDO" ? "PERÍODO" : filtroPeriodo} 
                opcoes={["TUDO", "HOJE", "ESTA SEMANA", "ESTE MÊS"]} 
                isOpen={menuAberto === 'periodo'}
                onToggle={() => setMenuAberto(menuAberto === 'periodo' ? null : 'periodo')}
                onSelect={(v) => { setFiltroPeriodo(v || "TUDO"); setMenuAberto(null); }}
            />

            <FiltroDropdown 
                label={filtroAvaliador === "TODOS" ? "AVALIADOR" : filtroAvaliador.split(" ")[0]} 
                opcoes={avaliadoresDisponiveis} 
                isOpen={menuAberto === 'avaliador'}
                onToggle={() => setMenuAberto(menuAberto === 'avaliador' ? null : 'avaliador')}
                onSelect={(v) => { setFiltroAvaliador(v || "TODOS"); setMenuAberto(null); }}
            />

            <button 
              onClick={() => navigate("/avaliacoes/nova")}
              className="w-full sm:w-[160px] h-[40px] rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 hover:opacity-90 transition-all shadow-md active:scale-95 text-white outline-none shrink-0"
              style={{ backgroundColor: 'var(--bg-sidebar)' }}
            >
              <Plus size={14} strokeWidth={3} />
              <span className="truncate">Nova Avaliação</span>
            </button>
        </div>

      </header>

      <section className="flex flex-col gap-6 flex-1 min-h-0 items-stretch mt-2 pb-4 w-full">
        <div className="flex-1 flex flex-col min-h-0 transition-all duration-300 bg-transparent">
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center bg-transparent">
                  <Loader2 className="animate-spin mb-2" style={{ color: 'var(--bg-sidebar)' }} size={32} />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>BUSCANDO AVALIAÇÕES...</span>
                </div>
            ) : dadosFiltrados.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-60 bg-transparent border rounded-2xl border-dashed" style={{ borderColor: 'var(--border-color)' }}>
                   <Activity size={48} style={{ color: 'var(--text-main)' }} className="opacity-40" />
                   <p className="font-black uppercase text-[10px] mt-4 tracking-widest text-center px-4" style={{ color: 'var(--text-main)' }}>
                      Nenhuma avaliação encontrada.
                   </p>
                </div>
            ) : (
                <div className="flex-1 bg-transparent flex flex-col overflow-hidden custom-slim-scroll">
                    <TabelaBase 
                        dados={dadosFiltrados} 
                        colunas={colunas} 
                        onLinhaClick={(av) => navigate(`/avaliacoes/cliente/${av.idAvaliacao}`)}
                    />
                </div>
            )}
        </div>
      </section>
      
    </main>
  );
}

function FiltroDropdown({ label, opcoes, isOpen, onToggle, onSelect, icon: Icon = ChevronDown }) {
    return (
        <div className="relative flex-1 sm:flex-none">
            <button 
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