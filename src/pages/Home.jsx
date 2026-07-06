import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, Megaphone, BellRing, Loader2, 
  CheckCircle2, Calendar as CalendarIcon, TrendingUp,
  DollarSign, Package, PackagePlus, UserPlus, FileText,
  Users, Dumbbell, ClipboardList, AlertTriangle, Activity,
  BarChart2, Eye, EyeOff, Wind, LineChart, Check
} from "lucide-react";

import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import CadastroCliente from "../components/register/CadastroCliente";
import CarrinhoCompras from "../components/pdv/CarrinhoCompras";
import ModalOpcoesEstoque from "../components/modal/ModalOpcoesEstoque";
import ModalRegistroEntrada from "../components/modal/ModalRegistroEntrada";
import ModalRegistroPerda from "../components/modal/ModalRegistroPerda";
import ModalEmBreve from "../components/modal/ModalEmBreve";
import MenuInferior from "../layouts/MenuInferior";
import imgCarrinho from "../assets/icons/carrinho.png";
import imgCadastro from "../assets/icons/cadastro.png";
import imgAutoatendimento from "../assets/icons/autosserviço.png";
import imgEstoque from "../assets/icons/movEstoque.png";
import imgAdcProduto from "../assets/icons/adcproduto.png";
import imgColab from "../assets/icons/colab.png";
import imgRelatorios from "../assets/icons/relatorios.png";
import imgSangria from "../assets/icons/dinheiro.png";
import imgAvaliacao from "../assets/icons/avaliacao.png";
import imgTreinos from "../assets/icons/agenda.png";
import imgClientes from "../assets/icons/clientes.png";
import imgHistorico from "../assets/icons/tabelacard.png";

const marqueeStyles = `
  .marquee-container { width: 100%; overflow: hidden; white-space: nowrap; position: relative; display: flex; align-items: center; }
  .marquee-content { display: inline-block; padding-left: 100%; animation: marquee 25s linear infinite; }
  .marquee-content:hover { animation-play-state: paused; }
  @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-100%); } }
`;

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saudacao, setSaudacao] = useState("");
  const [diasSemana, setDiasSemana] = useState([]);
  const [mostrarDados, setMostrarDados] = useState(false);
  const [meta, setMeta] = useState({ atual: 0, objetivo: 1, porcentagem: 0 });
  const [tarefas, setTarefas] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [avisosSistema, setAvisosSistema] = useState(["Nenhum aviso pendente."]);
  const [alunosAtivos, setAlunosAtivos] = useState(0);
  const [fluxosPendentes, setFluxosPendentes] = useState(0);
  const [alertasEstoque, setAlertasEstoque] = useState([]);
  const [equipeDesempenho, setEquipeDesempenho] = useState([]);
  const [periodoGrafico, setPeriodoGrafico] = useState("mes");
  const [avaliacoesPendentes, setAvaliacoesPendentes] = useState(0);
  const [avaliacoesCliente, setAvaliacoesCliente] = useState([]);
  const [abrirCarrinho, setAbrirCarrinho] = useState(false);
  const [abrirNovoCliente, setAbrirNovoCliente] = useState(false);
  const [modalAutoatendimento, setModalAutoatendimento] = useState(false);
  const [modalOpcoesEstoque, setModalOpcoesEstoque] = useState(false);
  const [abrirEntradaEstoque, setAbrirEntradaEstoque] = useState(false);
  const [abrirPerdaEstoque, setAbrirPerdaEstoque] = useState(false);
  const [abrirModalEmBreve, setAbrirModalEmBreve] = useState(false);
  
  const [activeMenuIndex, setActiveMenuIndex] = useState(2);

  const definirSaudacao = useCallback(() => {
    const hora = new Date().getHours();
    if (hora < 12) return "Bom dia";
    if (hora < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const gerarMiniCalendario = useCallback(() => {
    const dataAtual = new Date();
    const dias = [];
    for (let i = -1; i <= 5; i++) {
      const d = new Date(dataAtual);
      d.setDate(dataAtual.getDate() + i);
      dias.push({ dia: d.getDate(), semana: d.toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3).replace('.', ''), isHoje: i === 0 });
    }
    return dias;
  }, []);

  useEffect(() => {
    setSaudacao(definirSaudacao());
    setDiasSemana(gerarMiniCalendario());

    if (!user) return;

    const fetchJson = async (endpoint) => {
      const res = await apiFetch(endpoint, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      return res.json();
    };

    const carregarDashboard = async () => {
      try {
        const idFunc = user.idFuncionario || null;
        const idCli = user.idCliente || user.id || null;
        const idUnid = user.idUnidade || user.unidade?.idUnidade;
        const cargoFunc = String(user.cargo || user.perfilAcesso?.nome || user.perfilAcesso || "CLIENTE").toLowerCase();
        
        const hojeIso = new Date().toISOString().split('T')[0];
        const isGerente = cargoFunc.includes("dono") || cargoFunc.includes("gerente") || cargoFunc.includes("admin");
        const isProfessor = cargoFunc.includes("professor") || cargoFunc.includes("instrutor") || cargoFunc.includes("personal");
        const isFuncionario = cargoFunc.includes("recepcao") || isProfessor || isGerente;
        const isCliente = cargoFunc.includes("cliente") || cargoFunc.includes("aluno");

        fetchJson('/avisos/ativos')
          .then(res => {
            if (Array.isArray(res) && res.length > 0) setAvisosSistema(res.map(a => a.mensagem));
          })
          .catch(() => {});

        if (isFuncionario) {
          const [caixasRes, tarefasRes, agendaRes, funcionariosRes, vendasRes, pendentesRes, produtosRes, clientesRes] = await Promise.allSettled([
            fetchJson('/caixas'),
            idFunc ? fetchJson(`/tarefas-diarias/funcionario/${idFunc}/status/PENDENTE`) : Promise.resolve([]),
            idUnid ? fetchJson(`/agendamentos/unidade/${idUnid}?inicio=${hojeIso}T00:00:00&fim=${hojeIso}T23:59:59`) : Promise.resolve([]),
            isGerente ? fetchJson('/funcionarios') : Promise.resolve([]),
            isGerente ? fetchJson('/vendas') : Promise.resolve([]),
            (isGerente && idUnid) ? fetchJson(`/tarefas-diarias/pendentes/unidade/${idUnid}`) : Promise.resolve([]),
            isGerente ? fetchJson('/produtos?page=0&size=100').catch(() => ({ content: [] })) : Promise.resolve({ content: [] }),
            isGerente ? fetchJson('/clientes').catch(() => ([])) : Promise.resolve([])
          ]);

          if (caixasRes.status === 'fulfilled' && caixasRes.value?.resumo) {
            const resumo = caixasRes.value.resumo;
            const atual = resumo.totalConferido || 0;
            const objetivo = resumo.totalPrevisto || 1; 
            setMeta({ atual, objetivo, porcentagem: Math.min(100, Math.round((atual / objetivo) * 100)) });
          }
          if (tarefasRes.status === 'fulfilled' && Array.isArray(tarefasRes.value)) {
            setTarefas(tarefasRes.value.map(t => ({ id: t.id, texto: t.nomeTarefa || "Tarefa", concluida: t.status === 'CONCLUIDA' })));
          }
          if (agendaRes.status === 'fulfilled' && Array.isArray(agendaRes.value)) {
            setAgenda(agendaRes.value.map(a => ({ 
              id: a.id, 
              hora: new Date(a.dataHoraInicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), 
              servico: a.nomeServico, 
              cliente: a.nomeCliente, 
              status: a.status?.toLowerCase() 
            })));
          }

          if (isProfessor && idFunc) {
            fetchJson(`/avaliacoes/pendentes/funcionario/${idFunc}`)
              .then(res => { if (Array.isArray(res)) setAvaliacoesPendentes(res.length); })
              .catch(() => setAvaliacoesPendentes(0));
          }
          
          if (isGerente) {
            if (clientesRes.status === 'fulfilled' && Array.isArray(clientesRes.value)) setAlunosAtivos(clientesRes.value.length);
            if (pendentesRes.status === 'fulfilled' && Array.isArray(pendentesRes.value)) setFluxosPendentes(pendentesRes.value.length);
            if (produtosRes.status === 'fulfilled' && produtosRes.value?.content) {
              const baixos = produtosRes.value.content.flatMap(p => p.variacoes || []).filter(v => v.estoqueAtual <= (v.estoqueMinimo || 5));
              setAlertasEstoque(baixos.map(v => ({ id: v.id, nome: v.nomeCompleto, saldo: v.estoqueAtual })));
            }
            if (funcionariosRes.status === 'fulfilled' && Array.isArray(funcionariosRes.value)) {
              const funcsPermitidos = funcionariosRes.value.filter(f => ["RECEPCIONISTA", "LIDER_VENDA", "PERSONAL_TRAINER"].includes(f.cargo));
              const vendasFeitas = vendasRes.status === 'fulfilled' && Array.isArray(vendasRes.value) ? vendasRes.value : [];
              const desempenhoCalc = funcsPermitidos.map(f => {
                const vendasFunc = vendasFeitas.filter(v => f.idFuncionario === v.idFuncionario || v.funcionario?.idFuncionario === f.idFuncionario);
                const nomeProf = (f.nomeRegistro || f.nomeCompleto).trim().split(" ")[0];
                return { 
                  nome: nomeProf.charAt(0).toUpperCase() + nomeProf.slice(1).toLowerCase(), 
                  vendas: vendasFunc.length, 
                  aval: 0 
                };
              });
              setEquipeDesempenho(desempenhoCalc);
            }
          }
        } else if (isCliente && idCli) {
          const avaliacoesRes = await fetchJson(`/avaliacoes/cliente/${idCli}`).catch(() => []);
          setAvaliacoesCliente(Array.isArray(avaliacoesRes) ? avaliacoesRes : []);
        }
      } catch (error) {
        console.error("Erro ao carregar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    carregarDashboard();
  }, [user, definirSaudacao, gerarMiniCalendario]);

  const menuItensInferior = useMemo(() => {
    if (!user) return [];
    const cargo = String(user.cargo || user.perfilAcesso || "").toLowerCase();
    
    if (cargo.includes("dono") || cargo.includes("gerente") || cargo.includes("admin")) {
      return [
        { label: "Financeiro", icon: <DollarSign size={20} />, action: () => navigate('/financeiro') },
        { label: "Estoque", icon: <Package size={20} />, action: () => navigate('/estoque') },
        { label: "Home", icon: <TrendingUp size={22} />, action: () => navigate('/') },
        { label: "Gerência", icon: <BarChart2 size={20} />, action: () => navigate('/gerencia') },
        { label: "Perfil", icon: <UserPlus size={20} />, action: () => navigate('/perfil') }
      ];
    }
    if (cargo.includes("professor") || cargo.includes("instrutor") || cargo.includes("personal")) {
      return [
        { label: "Treinos", icon: <Dumbbell size={20} />, action: () => setAbrirModalEmBreve(true) },
        { label: "Avaliação", icon: <ClipboardList size={20} />, action: () => navigate('/avaliacoes') },
        { label: "Home", icon: <Activity size={22} />, action: () => navigate('/') },
        { label: "Clientes", icon: <Users size={20} />, action: () => navigate('/clientes') },
        { label: "Perfil", icon: <FileText size={20} />, action: () => navigate('/perfil') }
      ];
    }
    if (cargo.includes("cliente") || cargo.includes("aluno")) {
      return [
        { label: "Treinos", icon: <Dumbbell size={20} />, action: () => setAbrirModalEmBreve(true) },
        { label: "Agendar", icon: <CalendarIcon size={20} />, action: () => navigate('/agendamento') },
        { label: "Home", icon: <Activity size={22} />, action: () => navigate('/') },
        { label: "Evolução", icon: <LineChart size={20} />, action: () => navigate('/minha-evolucao') },
        { label: "Perfil", icon: <UserPlus size={20} />, action: () => navigate('/meu-perfil') }
      ];
    }
    return [
      { label: "Caixa", icon: <DollarSign size={20} />, action: () => navigate('/caixa') },
      { label: "Ações", icon: <PackagePlus size={20} />, action: () => setAbrirCarrinho(true) }, 
      { label: "Home", icon: <CalendarIcon size={22} />, action: () => navigate('/') },
      { label: "Clientes", icon: <Users size={20} />, action: () => navigate('/clientes') },
      { label: "Perfil", icon: <FileText size={20} />, action: () => navigate('/perfil') }
    ];
  }, [user, navigate]);

  const toggleTarefa = async (id, concluidaAtual) => {
    setTarefas(prev => prev.map(t => t.id === id ? { ...t, concluida: !t.concluida } : t));
  };

  const renderValorSensivel = (valor, tipo = 'moeda') => {
    if (!mostrarDados) return "••••••";
    if (tipo === 'moeda') return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    if (tipo === 'porcentagem') return `${valor}%`;
    return valor;
  };

  if (loading || !user) {
    return <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-body)]"><Loader2 className="animate-spin text-[var(--bg-sidebar)]" size={40} /></div>;
  }

  const cargoUser = String(user.cargo || user.perfilAcesso || "CLIENTE").toLowerCase();
  
  const renderCliente = () => (
    <div className="flex flex-col h-full gap-5 lg:gap-6 min-h-0">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 shrink-0">
        <div className="col-span-1 lg:col-span-8 rounded-2xl p-6 lg:p-8 relative overflow-hidden flex items-center shadow-sm text-white" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10 flex items-center gap-5 w-full">
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md shrink-0 shadow-inner hidden sm:block">
               <Activity size={28} />
            </div>
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 px-2 py-1 rounded inline-block mb-2">Portal do Aluno</span>
              <h2 className="text-xl md:text-2xl font-bold mb-1 leading-none truncate">Seu corpo, suas regras.</h2>
              <p className="opacity-70 text-sm mt-1">Acompanhe sua rotina e evolução diretamente por aqui.</p>
            </div>
          </div>
        </div>
        <div className="col-span-1 lg:col-span-4 rounded-2xl p-6 shadow-sm border flex flex-col justify-center items-start overflow-hidden relative bg-[var(--bg-card)] text-[var(--text-main)] border-[var(--border-color)]">
           <div className="flex items-center gap-2 mb-3 shrink-0 opacity-70">
              <BellRing size={16} />
              <h3 className="text-[11px] font-bold uppercase tracking-widest">Avisos</h3>
           </div>
           <div className="marquee-container w-full">
              <div className="marquee-content text-sm font-bold opacity-90 tracking-wide">
                 {avisosSistema.join("  ✦  ")}
              </div>
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)] shadow-sm min-h-0 pb-6 text-[var(--text-main)]">
         <div className="flex justify-between items-center mb-6 shrink-0">
            <div className="flex items-center gap-2 opacity-60">
              <LineChart size={16} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Evolução Fisiológica</h3>
            </div>
            <button className="text-[10px] uppercase font-bold px-3 py-1.5 rounded-lg opacity-80 hover:opacity-100 transition-opacity bg-[var(--bg-body)] border border-[var(--border-color)] outline-none">
              Ver Histórico Completo
            </button>
         </div>
         
         <div className="flex-1 overflow-auto custom-scrollbar">
             {avaliacoesCliente.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-30 text-center">
                    <Dumbbell size={40} className="mb-3" />
                    <p className="text-[11px] font-bold uppercase tracking-widest">Você ainda não possui avaliações registradas.</p>
                </div>
             ) : (
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                        <tr className="border-b border-[var(--border-color)] opacity-50 text-[10px] uppercase tracking-widest">
                            <th className="py-3 px-4 font-bold">Data</th>
                            <th className="py-3 px-4 font-bold">Peso (kg)</th>
                            <th className="py-3 px-4 font-bold">Gordura (%)</th>
                            <th className="py-3 px-4 font-bold">Massa Magra (kg)</th>
                            <th className="py-3 px-4 font-bold">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {avaliacoesCliente.map((aval, i) => (
                            <tr key={aval.id || i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-body)] transition-colors">
                                <td className="py-4 px-4 text-sm font-bold opacity-80">{new Date(aval.dataRegistro).toLocaleDateString('pt-BR')}</td>
                                <td className="py-4 px-4 text-sm font-semibold">{aval.peso}</td>
                                <td className="py-4 px-4 text-sm font-semibold opacity-80">{aval.gordura}</td>
                                <td className="py-4 px-4 text-sm font-semibold opacity-80">{aval.massaMagra}</td>
                                <td className="py-4 px-4">
                                  <span className="text-[10px] font-bold uppercase px-2 py-1 rounded border border-[var(--border-color)] bg-[var(--bg-body)]">
                                    {aval.statusGeral || "Registrado"}
                                  </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             )}
         </div>
      </div>
    </div>
  );

  const renderGerente = () => {
    const maxVendas = Math.max(...equipeDesempenho.map(d => d.vendas || 0), 1);
    const maxAvaliacoes = Math.max(...equipeDesempenho.map(d => d.aval || 0), 1);

    return (
      <div className="flex flex-col h-full gap-5 lg:gap-6 min-h-0 text-[var(--text-main)]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5 shrink-0">
           <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[10px] uppercase opacity-50 font-bold tracking-widest block mb-1">Faturamento Diário</span>
              <span className="text-2xl font-black">{renderValorSensivel(meta.atual, 'moeda')}</span>
           </div>
           <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[10px] uppercase opacity-50 font-bold tracking-widest block mb-1">Alunos Ativos</span>
              <span className="text-2xl font-black">{renderValorSensivel(alunosAtivos, 'numero')}</span>
           </div>
           <div className="p-6 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow">
              <span className="text-[10px] uppercase opacity-50 font-bold tracking-widest block mb-1">Fluxos Pendentes</span>
              <span className="text-2xl font-black">{renderValorSensivel(fluxosPendentes, 'numero')}</span>
           </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5 shrink-0">
           <ShortcutCard title="Novo Plano" imgSrc={imgAdcProduto} onClick={() => navigate('/planos/novo')} />
           <ShortcutCard title="Equipe" imgSrc={imgColab} onClick={() => navigate('/funcionarios')} />
           <ShortcutCard title="Relatórios" imgSrc={imgRelatorios} onClick={() => navigate('/relatorios')} />
           <ShortcutCard title="Financeiro" imgSrc={imgSangria} onClick={() => navigate('/financeiro')} />
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 min-h-0 pb-6">
          <div className="col-span-1 lg:col-span-8 flex flex-col h-full bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)] shadow-sm">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <div className="flex items-center gap-2 opacity-60">
                <BarChart2 size={16} />
                <h3 className="text-xs font-bold uppercase tracking-widest">Produtividade por Cargo</h3>
              </div>
              <select 
                value={periodoGrafico} onChange={(e) => setPeriodoGrafico(e.target.value)}
                className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg outline-none bg-[var(--bg-body)] border border-[var(--border-color)] cursor-pointer text-[var(--text-main)]"
              >
                <option value="hoje">Hoje</option>
                <option value="semana">Esta Semana</option>
                <option value="mes">Este Mês</option>
              </select>
            </div>
            {equipeDesempenho.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center">
                  <Wind size={40} className="mb-3" />
                  <p className="text-[11px] font-bold uppercase tracking-widest">Sem profissionais elegíveis.</p>
               </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-[150px]">
                <div className="flex-1 flex items-end gap-4 sm:gap-6 px-2 sm:px-4">
                  {equipeDesempenho.map((item, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full">
                      <div className="flex-1 flex items-end gap-1.5 w-full justify-center min-h-[50px]">
                        <div className="w-1/3 bg-[var(--text-main)] opacity-80 rounded-t-md transition-all duration-1000 min-h-[4px]" style={{ height: `${((item.vendas || 0) / maxVendas) * 100}%` }} title={`Vendas: ${item.vendas}`} />
                        <div className="w-1/3 bg-[var(--text-main)] opacity-40 rounded-t-md transition-all duration-1000 min-h-[4px]" style={{ height: `${((item.aval || 0) / maxAvaliacoes) * 100}%` }} title={`Avaliações: ${item.aval}`} />
                      </div>
                      <span className="text-[10px] font-bold opacity-60 text-center truncate w-full shrink-0">{item.nome}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-center gap-6 mt-6 shrink-0">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[var(--text-main)] opacity-80 rounded-full"></div><span className="text-[10px] font-bold opacity-60 uppercase">Vendas</span></div>
                  <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[var(--text-main)] opacity-40 rounded-full"></div><span className="text-[10px] font-bold opacity-60 uppercase">Avaliações</span></div>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-1 lg:col-span-4 flex flex-col h-full bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)] shadow-sm">
            <div className="flex items-center gap-2 mb-6 shrink-0 opacity-80">
              <AlertTriangle size={16} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Alerta de Ruptura</h3>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2 relative">
               {alertasEstoque.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-40 text-center">
                    <CheckCircle2 size={32} />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Estoque regularizado.</p>
                  </div>
               ) : (
                  alertasEstoque.map(alerta => (
                    <div key={alerta.id} className="flex flex-col p-4 rounded-xl bg-[var(--bg-body)] border border-[var(--border-color)] shrink-0">
                      <span className="text-sm font-bold opacity-90 truncate">{alerta.nome}</span>
                      <span className="text-xs font-semibold mt-1 opacity-70">Apenas {alerta.saldo} unid.</span>
                    </div>
                  ))
               )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRecepcao = () => (
    <div className="flex flex-col h-full gap-5 lg:gap-6 min-h-0 text-[var(--text-main)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 shrink-0">
        <div className="col-span-1 lg:col-span-8 rounded-2xl p-6 lg:p-8 relative overflow-hidden flex items-center shadow-sm" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10 flex items-center gap-5 w-full text-white">
            <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md shrink-0 shadow-inner hidden sm:block"><Megaphone size={28} /></div>
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 px-2 py-1 rounded inline-block mb-2">Aviso Operacional</span>
              <h2 className="text-xl md:text-2xl font-bold mb-1 leading-none truncate">Caixa aberto e operante.</h2>
            </div>
          </div>
        </div>
        <div className="col-span-1 lg:col-span-4 rounded-2xl p-6 shadow-sm border flex flex-col justify-center items-start overflow-hidden relative bg-[var(--bg-card)] border-[var(--border-color)]">
           <div className="flex items-center gap-2 mb-3 shrink-0 opacity-70"><BellRing size={16} /><h3 className="text-[11px] font-bold uppercase tracking-widest">Mural</h3></div>
           <div className="marquee-container w-full"><div className="marquee-content text-sm font-bold opacity-90 tracking-wide">{avisosSistema.join("  ✦  ")}</div></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5 shrink-0">
        <ShortcutCard title="Nova Venda" imgSrc={imgCarrinho} onClick={() => setAbrirCarrinho(true)} />
        <ShortcutCard title="Matrícula" imgSrc={imgCadastro} onClick={() => setAbrirNovoCliente(true)} />
        <ShortcutCard title="Check-in" imgSrc={imgAutoatendimento} onClick={() => setModalAutoatendimento(true)} />
        <ShortcutCard title="Agenda" imgSrc={imgTreinos} onClick={() => navigate('/agenda')} />
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 min-h-0 pb-6">
        <div className="col-span-1 lg:col-span-4 flex flex-col h-full bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center gap-2 mb-6 shrink-0 opacity-60"><CalendarIcon size={16} /><h3 className="text-xs font-bold uppercase tracking-widest">Agenda Diária</h3></div>
          <div className="flex justify-between mb-6 shrink-0 border-b pb-4 overflow-x-auto gap-2 border-[var(--border-color)]">
            {diasSemana.map((d, i) => (
              <div key={i} className="flex flex-col items-center justify-center shrink-0 w-10 h-14 rounded-xl" style={d.isHoje ? { backgroundColor: 'var(--bg-sidebar)', color: 'white' } : {}}>
                <span className="text-[10px] font-bold uppercase opacity-70">{d.semana}</span><span className="text-sm font-black">{d.dia}</span>
              </div>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pr-2">
            {agenda.length === 0 ? <p className="text-[11px] font-bold opacity-30 text-center mt-6 uppercase tracking-widest">Livre.</p> : agenda.map(item => (
              <div key={item.id} className="flex gap-4 group">
                <div className="mt-1 w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: 'var(--bg-sidebar)' }}></div>
                <div className="flex-1 bg-[var(--bg-body)] rounded-xl p-4 shadow-sm border border-transparent min-w-0">
                  <div className="flex items-center gap-3 mb-1.5"><span className="text-xs font-black opacity-60 bg-[var(--bg-card)] px-2 py-1 rounded-md">{item.hora}</span><span className="text-sm font-bold opacity-90 truncate">{item.servico}</span></div>
                  <p className="text-xs font-semibold opacity-50 truncate">{item.cliente}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

       <div className="col-span-1 lg:col-span-4 flex flex-col h-full bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)] shadow-sm">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2 opacity-60">
              <DollarSign size={16} />
              <h3 className="text-xs font-bold uppercase tracking-widest">Status do Caixa</h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest border border-[var(--border-color)] px-2.5 py-1 rounded-md flex items-center gap-1 opacity-80">
               <Check size={12} /> Aberto
            </span>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center bg-[var(--bg-body)] rounded-2xl p-6 border border-[var(--border-color)] mb-5">
             <p className="text-[11px] font-semibold opacity-50 mb-2 uppercase tracking-widest">Saldo Parcial Operante</p>
             <p className="text-3xl font-black truncate">{renderValorSensivel(meta.atual, 'moeda')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-auto shrink-0">
             <button onClick={() => navigate('/financeiro/caixa')} className="text-[10px] font-bold uppercase px-3 py-2.5 rounded-xl bg-[var(--bg-body)] border border-[var(--border-color)] opacity-80 hover:opacity-100 hover:bg-[var(--border-color)] transition-colors outline-none text-center">
               Movimentar
             </button>
             <button onClick={() => navigate('/financeiro/fechar-caixa')} className="text-[10px] font-bold uppercase px-3 py-2.5 rounded-xl bg-[var(--bg-sidebar)] text-white shadow-sm opacity-90 hover:opacity-100 transition-opacity outline-none text-center border border-transparent">
               Fechar Caixa
             </button>
          </div>
        </div>

        <div className="col-span-1 lg:col-span-4 flex flex-col h-full bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)] shadow-sm">
          <div className="flex justify-between items-center mb-5 shrink-0">
            <div className="flex items-center gap-2 opacity-60"><CheckCircle2 size={16} /><h3 className="text-xs font-bold uppercase tracking-widest">Tarefas</h3></div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[var(--border-color)]">{tarefas.filter(t => t.concluida).length}/{tarefas.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2.5 pr-2">
             {tarefas.length === 0 ? <p className="text-[11px] font-bold opacity-30 text-center mt-6 uppercase tracking-widest">Tudo feito!</p> : tarefas.map(tarefa => (
               <label key={tarefa.id} className="flex items-center gap-4 p-3.5 rounded-[18px] cursor-pointer bg-[var(--bg-body)] shrink-0">
                 <input type="checkbox" checked={tarefa.concluida} onChange={() => toggleTarefa(tarefa.id, tarefa.concluida)} className="w-5 h-5 border-2 rounded-md transition-all cursor-pointer" style={{ borderColor: tarefa.concluida ? 'var(--bg-sidebar)' : 'var(--border-color)' }} />
                 <span className={`text-sm font-semibold select-none ${tarefa.concluida ? 'opacity-30 line-through' : 'opacity-90'}`}>{tarefa.texto}</span>
               </label>
             ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderProfessor = () => (
    <div className="flex flex-col h-full gap-5 lg:gap-6 min-h-0 text-[var(--text-main)]">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 shrink-0">
        <div className="col-span-1 lg:col-span-8 rounded-2xl p-8 relative overflow-hidden flex items-center shadow-sm text-white" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
          <div className="relative z-10 flex items-center gap-5 w-full">
            <div className="p-4 bg-white/10 rounded-xl backdrop-blur-md shrink-0 shadow-inner hidden sm:block"><Activity size={28} /></div>
            <div className="flex-1">
              <span className="text-[10px] font-bold uppercase tracking-widest bg-white/10 px-2 py-1 rounded inline-block mb-2">Próxima Aula</span>
              <h2 className="text-2xl font-bold mb-1 leading-none truncate">Aulas do Dia</h2>
              <p className="opacity-80 text-sm mt-1">{renderValorSensivel(agenda.length, 'numero')} aulas programadas.</p>
            </div>
          </div>
        </div>
        <div className="col-span-1 lg:col-span-4 rounded-2xl p-6 shadow-sm border flex flex-col justify-center items-center bg-[var(--bg-card)] border-[var(--border-color)]">
           <ClipboardList size={32} className="opacity-20 mb-2" />
           <span className="text-2xl font-black">{renderValorSensivel(avaliacoesPendentes, 'numero')}</span>
           <span className="text-[10px] font-bold uppercase opacity-50 tracking-widest text-center mt-1">Avaliações Pendentes</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-5 shrink-0">
         <ShortcutCard title="Meus Alunos" imgSrc={imgClientes} onClick={() => navigate('/clientes')} />
         <ShortcutCard title="Treinos" imgSrc={imgTreinos} onClick={() => setAbrirModalEmBreve(true)} />
         <ShortcutCard title="Avaliação" imgSrc={imgAvaliacao} onClick={() => navigate('/avaliacoes/nova')} />
         <ShortcutCard title="Agenda" imgSrc={imgHistorico} onClick={() => navigate('/agenda')} />
      </div>

      <div className="flex-1 grid grid-cols-1 gap-5 min-h-0 pb-6">
        <div className="rounded-2xl p-6 shadow-sm border flex flex-col h-full overflow-hidden bg-[var(--bg-card)] border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-6 shrink-0 opacity-60"><CalendarIcon size={16} /><h3 className="text-xs font-bold uppercase tracking-widest">Meus Alunos Hoje</h3></div>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-3 pr-2">
             {agenda.length === 0 ? <p className="text-[11px] font-bold opacity-30 text-center mt-6 uppercase tracking-widest">Sem turmas hoje.</p> : agenda.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-body)] border border-[var(--border-color)]">
                   <div className="flex items-center gap-4">
                      <span className="text-xs font-black opacity-60 px-2 py-1 rounded-md bg-[var(--bg-card)]">{item.hora}</span>
                      <span className="text-sm font-bold opacity-90">{item.cliente}</span>
                   </div>
                   <button className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg opacity-70 hover:opacity-100 transition-opacity outline-none bg-[var(--bg-sidebar)] text-white border border-[var(--border-color)]">
                     Registrar
                   </button>
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex-1 flex flex-col p-4 md:p-6 lg:p-8 font-sans relative overflow-hidden bg-[var(--bg-body)] text-[var(--text-main)]">
      <style>{marqueeStyles}</style>

      <header className="flex flex-col md:flex-row items-center justify-between mb-6 shrink-0 gap-4 min-h-[60px]">
        <div className="w-full md:w-1/3 flex items-center justify-center md:justify-start gap-4">
          <div className="text-center md:text-left text-[var(--text-main)]">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight truncate">
              {saudacao}, {user.nomeRegistro || user.nomeCompleto || "Usuário"}.
            </h1>
            <p className="text-sm opacity-60 font-medium mt-1 uppercase tracking-widest">Visão geral do sistema</p>
          </div>
          <button 
            onClick={() => setMostrarDados(!mostrarDados)} 
            className="p-2.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] opacity-70 hover:opacity-100 transition-all active:scale-95 outline-none text-[var(--text-main)]"
            title={mostrarDados ? "Ocultar dados sensíveis" : "Mostrar dados sensíveis"}
          >
            {mostrarDados ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>
        </div>
        
        <div className="w-full md:w-1/3 flex justify-center">
          <div className="relative w-full max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40 text-[var(--text-main)]" />
            <input type="text" placeholder="Pesquisar..." className="w-full py-2.5 pl-12 pr-4 rounded-full text-sm outline-none font-medium focus:ring-2 focus:ring-[var(--bg-sidebar)] transition-all bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)]" />
          </div>
        </div>
        <div className="hidden md:block w-1/3" />
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden pb-28 lg:pb-0 custom-scrollbar pr-1 lg:pr-0">
        {cargoUser.includes("cliente") || cargoUser.includes("aluno") ? renderCliente() :
         cargoUser.includes("dono") || cargoUser.includes("gerente") || cargoUser.includes("admin") ? renderGerente() : 
         cargoUser.includes("professor") || cargoUser.includes("instrutor") || cargoUser.includes("personal") ? renderProfessor() : 
         renderRecepcao()}
      </main>

      <MenuInferior items={menuItensInferior} activeIndex={activeMenuIndex} setActiveIndex={setActiveMenuIndex} />

      {abrirNovoCliente && <CadastroCliente isOpen={abrirNovoCliente} onClose={() => setAbrirNovoCliente(false)} />}
      {abrirCarrinho && (
        <div className="fixed inset-0 z-[2000] flex justify-end p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full sm:w-[450px] h-full relative sm:rounded-[40px] overflow-hidden">
             <CarrinhoCompras onClose={() => setAbrirCarrinho(false)} />
          </div>
        </div>
      )}
      <ModalOpcoesEstoque isOpen={modalOpcoesEstoque} onClose={() => setModalOpcoesEstoque(false)} onSelect={(tipo) => { if(tipo === 'entrada') setAbrirEntradaEstoque(true); else setAbrirPerdaEstoque(true);}} />
      <ModalRegistroEntrada isOpen={abrirEntradaEstoque} onClose={() => setAbrirEntradaEstoque(false)} />
      <ModalRegistroPerda isOpen={abrirPerdaEstoque} onClose={() => setAbrirPerdaEstoque(false)} />
      
      <ModalEmBreve isOpen={abrirModalEmBreve} onClose={() => setAbrirModalEmBreve(false)} />
    </div>
  );
}

function ShortcutCard({ title, imgSrc, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center gap-3 h-full py-6 rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1 group outline-none bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)]">
      <div 
        className="w-7 h-7 transition-transform group-hover:scale-110 shrink-0 opacity-70 group-hover:opacity-100"
        style={{
          backgroundColor: "currentColor",
          WebkitMask: `url(${imgSrc}) center/contain no-repeat`,
          mask: `url(${imgSrc}) center/contain no-repeat`
        }}
      />
      <span className="text-[10px] lg:text-[11px] font-extrabold uppercase tracking-widest opacity-70 truncate px-2 w-full text-center">{title}</span>
    </button>
  );
}