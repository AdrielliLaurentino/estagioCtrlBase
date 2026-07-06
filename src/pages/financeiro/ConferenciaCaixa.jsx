import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ClipboardCheck, ArrowLeft, Search, Loader2, 
  CheckCircle2, AlertCircle, Printer, Filter
} from "lucide-react";

const API_BASE = "/api";

const getAuthHeaders = () => {
    const userStr = localStorage.getItem("usuario") || localStorage.getItem("@CtrlBase:user") || "{}";
    const user = JSON.parse(userStr);
    const token = user.token || ""; 
    
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "id-operador": String(user.id || 1)
    };
};

export default function ConferenciaFinanceira() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [turnos, setTurnos] = useState([]);
  const [filtroData, setFiltroData] = useState(new Date().toISOString().split('T')[0]);

  const carregarTurnosParaConferencia = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const res = await fetch(`${API_BASE}/caixas/relatorio?periodo=HOJE&status=FECHADO`, { headers });
      
      if (res.ok) {
        const dados = await res.json();
        setTurnos(Array.isArray(dados) ? dados : (dados.listaCaixas || []));
      } else if (res.status === 403) {
        console.error("Erro 403: Token inválido ou expirado.");
      }
    } catch (error) {
      console.error("Erro ao carregar conferência:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarTurnosParaConferencia();
  }, [carregarTurnosParaConferencia]);

  const formatarMoeda = (v) => (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <main className="w-full h-full p-4 flex flex-col gap-6 animate-in fade-in duration-500">
      
      {/* HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/financeiro')} className="hover:opacity-70 text-[var(--text-main)]">
            <ArrowLeft size={20} strokeWidth={3} />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tight text-[var(--bg-sidebar)] flex items-center gap-2">
              <ClipboardCheck className="w-10 h-10" /> Conferência de Turnos
            </h1>
            <p className="text-[10px] sm:text-[11px] uppercase tracking-widest font-bold opacity-50 text-[var(--text-main)]">
              Auditoria de fechamentos e validação de maquininhas
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
            <input 
              type="date" 
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] px-4 py-2 rounded-xl text-xs font-bold outline-none"
            />
            <button className="p-2.5 rounded-xl bg-[var(--bg-sidebar)] text-white hover:scale-105 active:scale-95 transition-all">
              <Filter size={18} />
            </button>
        </div>
      </header>

      {/* ÁREA DE CONFERÊNCIA */}
      <section className="flex-1 overflow-y-auto custom-slim-scroll">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40">
            <Loader2 size={40} className="animate-spin mb-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Cruzando Dados do Sistema...</span>
          </div>
        ) : turnos.length === 0 ? (
          <div className="border-2 border-dashed border-[var(--border-color)] rounded-3xl py-20 flex flex-col items-center justify-center opacity-40">
            <Search size={40} className="mb-4" />
            <p className="text-xs font-bold uppercase">Nenhum turno fechado para conferir nesta data.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {turnos.map((turno) => (
              <div 
                key={turno.idCaixa}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col md:flex-row justify-between items-center gap-6 hover:shadow-lg transition-all"
              >
                <div className="flex flex-col gap-1 w-full md:w-1/3">
                  <span className="text-[10px] font-black opacity-40 uppercase tracking-widest">Operador</span>
                  <h3 className="text-sm font-bold uppercase text-[var(--text-main)]">{turno.nomeFuncionario}</h3>
                  <span className="text-[9px] opacity-60 font-bold uppercase">Abertura: {new Date(turno.dataAbertura).toLocaleTimeString()}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 flex-1 w-full">
                  <DestaqueValor label="Dinheiro Sistema" valor={turno.conferidoDinheiro} />
                  <DestaqueValor label="Cartão Sistema" valor={(turno.conferidoDebito || 0) + (turno.conferidoCredito || 0)} />
                  <DestaqueValor label="Pix Sistema" valor={turno.conferidoPix} />
                </div>

                <div className="flex items-center gap-3 shrink-0 w-full md:w-auto border-t md:border-t-0 md:border-l border-[var(--border-color)] pt-4 md:pt-0 md:pl-6">
                  <button className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center gap-2">
                    <CheckCircle2 size={16} /> Validar
                  </button>
                  <button className="p-3 rounded-xl border border-[var(--border-color)] text-[var(--text-main)] opacity-40 hover:opacity-100 transition-all">
                    <Printer size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function DestaqueValor({ label, valor }) {
  return (
    <div className="flex flex-col">
      <span className="text-[8px] font-black opacity-40 uppercase tracking-widest mb-1">{label}</span>
      <span className="text-sm font-black text-[var(--text-main)] tracking-tight">
        {(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </span>
    </div>
  );
}