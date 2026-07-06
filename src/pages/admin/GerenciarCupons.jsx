import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Ticket, Search, Plus, Activity, History, ShieldAlert, ArrowLeft, Loader2 } from "lucide-react";
import TabelaBase from "../../components/common/TabelaBase";
import CadastroCupom from "../../components/register/CadastroCupom";

const API_BASE = "http://localhost:8080";

export default function GerenciarCupons() {
  const navigate = useNavigate();

  const getUsuarioLogado = () => { try { return JSON.parse(localStorage.getItem("usuario")) || {}; } catch { return {}; } };
  const usuarioLogado = getUsuarioLogado();
  const cargoUsuario = String(usuarioLogado.cargo || usuarioLogado.perfilAcesso || "").toUpperCase();
  const temPermissaoAdmin = ["ADMIN", "GERENTE", "DONO"].includes(cargoUsuario);
  const [abaAtiva, setAbaAtiva] = useState(0); 
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [painelCadastroAberto, setPainelCadastroAberto] = useState(false);
  const [cupons, setCupons] = useState([]);
  const [historico, setHistorico] = useState([]);
  const carregarDados = async () => {
    if (!temPermissaoAdmin) return; 

    setLoading(true);
    try {
      const headers = { 
        "Authorization": `Bearer ${usuarioLogado.token}`, 
        "id-operador": String(usuarioLogado.id || 1) 
      };

      const resVouchers = await fetch(`${API_BASE}/vouchers`, { headers });
      const resHistorico = await fetch(`${API_BASE}/vouchers/historico`, { headers });

      if (resVouchers.ok) {
        const dados = await resVouchers.json();
        setCupons(dados.content || dados);
      }
      
      if (resHistorico.ok) {
        const dadosHist = await resHistorico.json();
        setHistorico(dadosHist.content || dadosHist);
      }

    } catch (error) {
      console.error("Erro ao carregar vouchers do servidor", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarDados(); }, [temPermissaoAdmin]);

  const handleCupomSalvo = (novoCupomForm) => {
    const novo = { 
        id: Date.now(), 
        ...novoCupomForm, 
        usos: 0, 
        limite: novoCupomForm.limiteUsos || "Ilimitado", 
        validade: novoCupomForm.dataValidade || "Sem Validade", 
        ativo: true 
    };
    setCupons([novo, ...cupons]);
  };

  const normalize = (text) => String(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const dadosFiltrados = useMemo(() => {
    const termo = normalize(busca);
    if (abaAtiva === 0) {
      return cupons.filter(c => normalize(c.codigo).includes(termo));
    } else {
      return historico.filter(h => normalize(h.cupom).includes(termo) || normalize(h.cliente).includes(termo));
    }
  }, [cupons, historico, busca, abaAtiva]);

  const formatarMoeda = (valor) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

  const colunasCupons = [
    { titulo: "Código do Voucher", campo: "codigo", render: (c) => (
        <div className="flex items-center gap-3 py-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center border border-dashed shrink-0" style={{ borderColor: 'var(--text-main)', backgroundColor: 'transparent', opacity: 0.5 }}>
               <Ticket size={16} style={{ color: 'var(--text-main)' }}/>
            </div>
            <span className="font-black text-sm tracking-widest uppercase" style={{ color: 'var(--text-main)' }}>{c.codigo}</span>
        </div>
    )},
    { titulo: "Regra", render: (c) => (
        <span className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm" style={{ backgroundColor: 'var(--border-color)', color: 'var(--text-main)' }}>
            {c.tipo === 'PERCENTUAL' ? `${c.valor}% OFF` : `${formatarMoeda(c.valor)} OFF`}
        </span>
    )},
    { titulo: "Uso", render: (c) => {
        const limitNum = c.limite === 'Ilimitado' ? 100 : c.limite; 
        const pct = c.limite === 'Ilimitado' ? 100 : Math.min((c.usos / limitNum) * 100, 100);
        return (
          <div className="flex flex-col gap-1.5 w-full max-w-[120px]">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60" style={{ color: 'var(--text-main)' }}>
                 <span>{c.usos} Usos</span>
                 <span>{c.limite}</span>
              </div>
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border-color)' }}>
                 <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: 'var(--bg-sidebar)' }} />
              </div>
          </div>
        )
    }},
    { titulo: "Validade", render: (c) => <span className="text-xs font-bold opacity-60" style={{ color: 'var(--text-main)' }}>{c.validade}</span> },
    { titulo: "Status", align: "center", render: (c) => (
        <span className={`px-2.5 py-1 rounded-[4px] text-[9px] font-black uppercase ${c.ativo ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-500'}`}>
            {c.ativo ? "Ativo" : "Inativo"}
        </span>
    )}
  ];

  const colunasHistorico = [
    { titulo: "Data", render: (h) => (
        <div className="flex flex-col py-1">
           <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>{new Date(h.data).toLocaleDateString('pt-BR')}</span>
           <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-0.5" style={{ color: 'var(--text-main)' }}>{new Date(h.data).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
    )},
    { titulo: "Cliente", campo: "cliente", render: (h) => <span className="font-bold text-sm uppercase truncate" style={{ color: 'var(--text-main)' }}>{h.cliente}</span> },
    { titulo: "Pedido", campo: "pedido", render: (h) => <span className="text-[10px] font-black tracking-widest opacity-40 uppercase" style={{ color: 'var(--text-main)' }}>{h.pedido}</span> },
    { titulo: "Voucher Usado", render: (h) => (
        <span className="text-[9px] font-black tracking-widest uppercase px-2.5 py-1.5 rounded-[6px] border border-dashed" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
           {h.cupom}
        </span> 
    )},
    { titulo: "Desconto Concedido", align: "right", render: (h) => <span className="font-black text-sm text-red-500 dark:text-red-400">- {formatarMoeda(h.descontoAplicado)}</span> }
  ];

  const totalDescontosMes = historico.reduce((acc, h) => acc + h.descontoAplicado, 0);

  if (!temPermissaoAdmin) {
    return (
      <div className="w-full h-full font-sans flex flex-col items-center justify-center animate-in fade-in duration-500 bg-transparent gap-4">
        <ShieldAlert size={80} strokeWidth={1.5} className="mb-2 text-red-500 opacity-80" />
        <h1 className="text-2xl font-black uppercase tracking-tighter" style={{ color: 'var(--text-main)' }}>Acesso Restrito</h1>
        <p className="text-[11px] font-bold uppercase tracking-widest opacity-40 text-center max-w-sm leading-relaxed" style={{ color: 'var(--text-main)' }}>
          Área exclusiva da administração. Você não tem permissões para gerenciar vouchers.
        </p>
        <button onClick={() => navigate(-1)} className="mt-4 px-8 py-4 rounded-[16px] text-white font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-3 transition-all hover:opacity-90 active:scale-95" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
          <ArrowLeft size={16} strokeWidth={3} /> Voltar ao Início
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="w-full h-full font-sans flex flex-col transition-colors duration-300 bg-transparent gap-6 animate-in fade-in duration-500">
        
        {/* HEADER  */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center shrink-0 gap-6">
          <div className="flex items-center gap-4 shrink-0">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md shrink-0" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
                <Ticket size={20} color="#FFF" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black uppercase tracking-tighter leading-none" style={{ color: 'var(--bg-sidebar)' }}>Vouchers</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 mt-1" style={{ color: 'var(--text-main)' }}>Painel Administrativo</p>
            </div>
          </div>

          <div className="flex gap-4 w-full lg:w-auto shrink-0">
              <div className="flex-1 lg:w-48 p-4 rounded-[20px] border shadow-sm flex flex-col justify-center transition-colors" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1" style={{ color: 'var(--text-main)' }}>Vouchers Ativos</span>
                  <span className="text-xl font-black tracking-tighter" style={{ color: 'var(--text-main)' }}>{cupons.filter(c => c.ativo).length}</span>
              </div>
              <div className="flex-1 lg:w-48 p-4 rounded-[20px] border shadow-sm flex flex-col justify-center transition-colors" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1" style={{ color: 'var(--text-main)' }}>Descontos (Mês)</span>
                  <span className="text-xl font-black tracking-tighter text-red-500 dark:text-red-400">- {formatarMoeda(totalDescontosMes)}</span>
              </div>
          </div>
        </header>

        {/* CONTROLES E FILTROS */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between shrink-0">
           
           <div className="flex p-1.5 rounded-2xl border shadow-sm w-full md:w-auto transition-colors" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <button 
                  onClick={() => setAbaAtiva(0)}
                  className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${abaAtiva === 0 ? 'shadow-md' : 'opacity-50 hover:opacity-80'}`}
                  style={{ backgroundColor: abaAtiva === 0 ? 'var(--bg-sidebar)' : 'transparent', color: abaAtiva === 0 ? '#FFF' : 'var(--text-main)' }}
              ><Activity size={14} strokeWidth={3} /> Ativos</button>
              
              <button 
                  onClick={() => setAbaAtiva(1)}
                  className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${abaAtiva === 1 ? 'shadow-md' : 'opacity-50 hover:opacity-80'}`}
                  style={{ backgroundColor: abaAtiva === 1 ? 'var(--bg-sidebar)' : 'transparent', color: abaAtiva === 1 ? '#FFF' : 'var(--text-main)' }}
              ><History size={14} strokeWidth={3} /> Histórico</button>
           </div>

           <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={16} style={{ color: 'var(--text-main)' }} />
                  <input 
                      type="text" placeholder="Buscar código ou cliente..." value={busca} onChange={(e) => setBusca(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 rounded-[16px] border outline-none text-xs font-bold shadow-sm transition-all focus:ring-2 focus:ring-gray-500/20" 
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  />
              </div>
              {abaAtiva === 0 && (
                  <button 
                    onClick={() => setPainelCadastroAberto(true)} 
                    className="h-[46px] px-6 rounded-[16px] text-white shadow-md active:scale-95 hover:scale-105 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shrink-0" 
                    style={{ backgroundColor: 'var(--bg-sidebar)' }}
                  >
                      <Plus size={16} strokeWidth={3} /> Criar
                  </button>
              )}
           </div>
        </div>

        {/* TABELA */}
        <main className="flex-1 flex flex-col min-h-0 bg-transparent pb-2">
           {loading ? (
               <div className="flex-1 flex flex-col items-center justify-center rounded-[24px] border shadow-sm transition-colors" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                  <Loader2 className="animate-spin mb-2" size={32} style={{ color: 'var(--bg-sidebar)' }} />
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>Sincronizando...</span>
               </div>
           ) : (
               <div className="flex-1 bg-transparent flex flex-col">
                 <TabelaBase 
                    dados={dadosFiltrados} 
                    colunas={abaAtiva === 0 ? colunasCupons : colunasHistorico} 
                    initialMode="tabela"
                    onInativar={abaAtiva === 0 ? (cupom) => alert(`Lógica para inativar voucher ${cupom.codigo} no Back-end!`) : undefined}
                 />
               </div>
           )}
        </main>
      </div>

      <CadastroCupom 
        isOpen={painelCadastroAberto} 
        onClose={() => setPainelCadastroAberto(false)} 
        onSalvo={handleCupomSalvo} 
      />
    </>
  );
}