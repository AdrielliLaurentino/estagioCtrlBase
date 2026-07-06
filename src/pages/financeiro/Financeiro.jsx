import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Wallet, Users, ArrowRight, CalendarDays,
  Loader2, AlertTriangle, LayoutDashboard, LayoutGrid, ClipboardCheck
} from "lucide-react";
import financeiroIcon from "../../assets/icons/financeiro.png";
import MenuInferior from "../../layouts/MenuInferior";
import TabelaBase from "../../components/common/TabelaBase"; 
import { apiFetch } from "../../services/api";

const formatarTitleCase = (text) => {
  if (!text) return "";
  return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const formatarMoeda = (valor) => 
  (valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

const formatarData = (dataString) => {
  if (!dataString) return "--";
  const data = new Date(dataString);
  data.setMinutes(data.getMinutes() + data.getTimezoneOffset()); 
  return data.toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit' });
};

const extrairListaCaixas = (dados) => Array.isArray(dados) ? dados : (dados.listaCaixas || []);

const calcularSaldoHoje = (dados) => {
  if (dados.totalGeral) return dados.totalGeral;
  if (dados.resumo?.totalConferido) return dados.resumo.totalConferido;
  
  return extrairListaCaixas(dados)
    .filter(c => c.status === 'FECHADO')
    .reduce((acc, c) => acc + (c.conferidoDinheiro || 0) + (c.conferidoPix || 0) + (c.conferidoDebito || 0) + (c.conferidoCredito || 0), 0);
};

const calcularFaturamentoMes = (dados) => {
  if (dados.totalGeral) return dados.totalGeral;
  if (dados.resumo?.totalConferido) return dados.resumo.totalConferido;

  return extrairListaCaixas(dados)
    .filter(c => c.status === 'FECHADO')
    .reduce((acc, c) => acc + (c.conferidoDinheiro || 0) + (c.conferidoPix || 0) + (c.conferidoDebito || 0) + (c.conferidoCredito || 0) + (c.conferidoCrediario || 0), 0);
};

const itensMenu = [
  { label: "Resumo", icon: <LayoutDashboard size={22} /> },
  { label: "Módulos", icon: <LayoutGrid size={22} /> },
  { label: "Agenda", icon: <CalendarDays size={22} /> }
];

const colunasVencimentos = [
  {
    titulo: "Cliente",
    campo: "cliente",
    render: (item) => (
      <span className="font-bold text-sm text-[var(--text-main)]">
        {formatarTitleCase(item.cliente)}
      </span>
    )
  },
  {
    titulo: "Vencimento",
    campo: "vencimento",
    align: "center",
    render: (item) => (
      <span className="text-[11px] font-bold opacity-80 text-[var(--text-main)]">
        {formatarData(item.vencimento)}
      </span>
    )
  },
  {
    titulo: "Status",
    campo: "status",
    align: "center",
    render: (item) => {
      const baseBadgeClass = "px-2.5 py-1 rounded-[6px] text-[9px] font-black uppercase tracking-widest border shadow-sm";
      if (item.status === 'ATRASADA') return <span className={`${baseBadgeClass} bg-red-500/10 text-red-600 dark:text-red-500 border-red-500/20`}>ATRASADO</span>;
      if (item.status === 'VENCE_HOJE') return <span className={`${baseBadgeClass} bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20`}>VENCE HOJE</span>;
      return <span className={`${baseBadgeClass} bg-gray-500/10 text-[var(--text-main)] border-[var(--border-color)]`}>A VENCER</span>;
    }
  },
  {
    titulo: "Valor Parcela",
    campo: "valor",
    align: "right",
    render: (item) => (
      <span className="text-sm font-black opacity-90 text-[var(--text-main)]">
        {formatarMoeda(item.valor)}
      </span>
    )
  }
];

export default function Financeiro() {
  const navigate = useNavigate();
  const [activeIndex, setActiveIndex] = useState(0); 
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [resumo, setResumo] = useState({
    saldoCaixaHoje: 0,
    contasReceber: 0,
    contasPagar: 0, 
    faturamentoMes: 0
  });
  const [vencimentosProximos, setVencimentosProximos] = useState([]);

  useEffect(() => {
    const carregarDashboard = async () => {
      setLoading(true);
      setErro(null);

      try {
        const [resCaixaHoje, resCaixaMes] = await Promise.allSettled([
          apiFetch(`/caixas/relatorio?periodo=HOJE`),
          apiFetch(`/caixas/relatorio?periodo=ESTE_MES`)
        ]);

        let saldoHojeCalc = 0;
        let faturamentoMesCalc = 0;

        if (resCaixaHoje.status === "fulfilled" && resCaixaHoje.value.ok) {
          const jsonHoje = await resCaixaHoje.value.json();
          saldoHojeCalc = calcularSaldoHoje(jsonHoje);
        }

        if (resCaixaMes.status === "fulfilled" && resCaixaMes.value.ok) {
          const jsonMes = await resCaixaMes.value.json();
          faturamentoMesCalc = calcularFaturamentoMes(jsonMes);
        }
        
        setResumo({ 
          saldoCaixaHoje: saldoHojeCalc, 
          contasReceber: 0, 
          contasPagar: 0, 
          faturamentoMes: faturamentoMesCalc 
        });
        setVencimentosProximos([]);

      } catch (err) {
        setErro("Não foi possível conectar ao servidor para carregar o Dashboard.");
      } finally {
        setLoading(false);
      }
    };

    carregarDashboard();
  }, []);

  return (
    <>
      <main className="w-full h-full font-sans flex flex-col bg-transparent gap-6 relative pb-20 lg:pb-0 px-3 lg:px-6 animate-in fade-in duration-500">
        
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center shrink-0 mt-4 mb-2 gap-6 w-full">
          <div className="flex items-center gap-4 shrink-0 w-full lg:w-auto">
            <div className="w-10 h-10 shrink-0 flex items-center justify-center">
              <div 
                className="w-full h-full" 
                style={{ 
                  backgroundColor: 'var(--bg-sidebar)', 
                  WebkitMaskImage: `url(${financeiroIcon})`, 
                  WebkitMaskSize: "contain", 
                  WebkitMaskRepeat: "no-repeat",
                  maskImage: `url(${financeiroIcon})`, 
                  maskSize: "contain",
                  maskRepeat: "no-repeat"
                }} 
              />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black italic uppercase tracking-tight leading-none" style={{ color: 'var(--bg-sidebar)' }}>
                Financeiro
              </h1>
              <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-widest opacity-60 mt-1 whitespace-nowrap" style={{ color: 'var(--text-main)' }}>
                Visão geral e módulos
              </p>
            </div>
          </div>
        </header>

        {erro && (
          <div className="p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 border shadow-sm bg-red-500/10 border-red-500/20 text-red-500 shrink-0 mx-1">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-xs font-bold uppercase tracking-wider">{erro}</p>
          </div>
        )}

        <section className="flex flex-col gap-6 flex-1 min-h-0 pb-4 overflow-y-auto custom-slim-scroll pr-1">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center rounded-[24px] border shadow-sm transition-colors bg-[var(--bg-card)] border-[var(--border-color)]">
              <Loader2 size={48} className="animate-spin mb-4 text-[var(--bg-sidebar)]" />
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--text-main)]">Sincronizando dados...</span>
            </div>
          ) : (
            <>
              <div className={`flex-col gap-6 ${activeIndex === 0 ? 'flex' : 'hidden lg:flex'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 shrink-0 p-1 -m-1">
                  <CardResumo label="Saldo Caixa (Hoje)" valor={formatarMoeda(resumo.saldoCaixaHoje)} />
                  <CardResumo label="A Receber (Crediário)" valor={formatarMoeda(resumo.contasReceber)} />
                  <CardResumo label="A Pagar (Despesas)" valor={formatarMoeda(resumo.contasPagar)} />
                  <CardResumo label="Faturamento (Mês)" valor={formatarMoeda(resumo.faturamentoMes)} />
                </div>
              </div>

              <div className={`flex-col gap-6 ${activeIndex === 1 ? 'flex' : 'hidden lg:flex'}`}>
                <div className="flex items-center justify-between mb-1 lg:hidden">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--text-main)]">Módulos</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 shrink-0 p-1 -m-1">
                  <ModuloCard 
                    onClick={() => navigate('/caixa')} 
                    icon={<Wallet size={20} strokeWidth={2} />} 
                    colorClass="bg-amber-500" 
                    title="Fluxo de Caixa" 
                    desc="Abertura, fechamento cego, suprimentos, sangrias e turnos." 
                  />
                  <ModuloCard 
                    onClick={() => navigate('/financeiro/conferencia')} 
                    icon={<ClipboardCheck size={20} strokeWidth={2} />} 
                    colorClass="bg-purple-500" 
                    title="Conferência" 
                    desc="Auditoria de turnos, verificação de quebras e validação." 
                  />
                  <ModuloCard 
                    onClick={() => navigate('/financeiro/contas-receber')} 
                    icon={<Users size={20} strokeWidth={2} />} 
                    colorClass="bg-blue-500" 
                    title="Contas" 
                    desc="Gestão de crediário (fiado), faturas e inadimplência." 
                  />
                </div>
              </div>

              <div className={`flex-col flex-1 min-h-0 ${activeIndex === 2 ? 'flex' : 'hidden lg:flex'}`}>
                <div className="flex justify-between items-center mb-4 lg:hidden">
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-[var(--text-main)]">Agenda de Vencimentos</span>
                  <button onClick={() => navigate('/financeiro/contas-receber')} className="text-[9px] font-black uppercase tracking-widest hover:underline text-[var(--bg-sidebar)]">
                    Ver Todos
                  </button>
                </div>
                
                <div className="flex-1 bg-transparent flex flex-col overflow-y-auto custom-slim-scroll tabela-financeiro-wrapper">
                  <style>{`
                    .tabela-financeiro-wrapper thead tr {
                        background-color: var(--bg-sidebar) !important;
                        color: #FFFFFF !important;
                    }
                    .tabela-financeiro-wrapper thead th {
                        color: #FFFFFF !important;
                    }
                  `}</style>
                  <TabelaBase 
                    dados={vencimentosProximos} 
                    colunas={colunasVencimentos} 
                    initialMode="tabela"
                  />
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      <MenuInferior 
        activeIndex={activeIndex} 
        setActiveIndex={setActiveIndex} 
        items={itensMenu} 
      />
    </>
  );
}

function CardResumo({ label, valor, onClick }) {
  return (
    <div 
      onClick={onClick} 
      className={`group p-6 border text-left lg:text-center shadow-sm flex flex-col justify-center gap-2 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl bg-[var(--bg-card)] border-[var(--border-color)] ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-95' : ''}`} 
    >
      <h2 className="text-[10px] font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]">{label}</h2>
      <p className="text-2xl font-black tracking-tight truncate transition-transform duration-300 group-hover:scale-105 text-[var(--text-main)]">{valor}</p>
    </div>
  );
}

function ModuloCard({ onClick, icon, colorClass, title, desc }) {
  return (
    <div onClick={onClick} className="group border rounded-[24px] p-6 flex flex-col justify-between shadow-sm cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-300 bg-[var(--bg-card)] border-[var(--border-color)] relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full opacity-10 transition-transform group-hover:scale-110 ${colorClass}`}></div>
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={`p-3 rounded-2xl shadow-sm flex items-center justify-center transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110 text-white ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div className="flex flex-col gap-1 mb-6 flex-1 relative z-10">
        <h3 className="font-black text-lg leading-tight uppercase text-[var(--text-main)]">{title}</h3>
        <span className="text-xs font-bold opacity-70 leading-relaxed mt-2 text-[var(--text-main)]">{desc}</span>
      </div>
      <div className={`flex items-center gap-2 text-[10px] sm:text-[11px] font-black uppercase tracking-widest transition-colors mt-auto relative z-10 text-${colorClass.replace('bg-', '')}`}>
        Acessar Módulo <ArrowRight size={14} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
}