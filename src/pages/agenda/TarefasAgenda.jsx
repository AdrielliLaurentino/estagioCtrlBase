import React, { useState, useEffect, useMemo } from "react";
import { 
  CheckCircle, Clock, Zap, User, Filter, AlertCircle, Plus 
} from "lucide-react";

import { TIPOS_TAREFA, getTarefaConfig } from "../../config/tarefasConfig";

export default function TarefasAgenda() {

  const [tarefas, setTarefas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState(null); 
  const usuarioLogado = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("usuario")) || { idUnidade: 1 }; } 
    catch { return { idUnidade: 1 }; }
  }, []);

  useEffect(() => {
    buscarTarefas();
  }, [usuarioLogado.idUnidade]);

  const buscarTarefas = async () => {
    setCarregando(true);
    try {
      const res = await fetch(`http://localhost:8080/tarefas/execucao/unidade/${usuarioLogado.idUnidade}`);
      if (res.ok) {
        const dados = await res.json();
        setTarefas(dados);
      } else {
        console.warn("Nenhuma tarefa encontrada ou erro na requisição.");
        setTarefas([]);
      }
    } catch (error) {
      console.error("Erro ao buscar tarefas:", error);
    } finally {
      setCarregando(false);
    }
  };

  const concluirTarefa = async (idTarefa) => {
    const tarefasOriginais = [...tarefas];
    setTarefas(tarefas.filter(t => t.id !== idTarefa));

    try {
      const res = await fetch(`http://localhost:8080/tarefas/execucao/${idTarefa}/concluir`, {
        method: 'PUT',
      });
      
      if (!res.ok) throw new Error("Falha ao concluir tarefa");
    } catch (error) {
      console.error("Erro ao concluir:", error);
      setTarefas(tarefasOriginais);
    }
  };
  const tarefasFiltradas = useMemo(() => {
    if (!filtroTipo) return tarefas;
    return tarefas.filter(t => t.tipoTarefa === filtroTipo);
  }, [tarefas, filtroTipo]);

  const TarefaCard = ({ tarefa }) => {
    const config = getTarefaConfig(tarefa.tipoTarefa || "ADMINISTRATIVO");

    return (
      <div className="group relative flex flex-col gap-3 p-4 md:p-5 rounded-[16px] bg-[var(--bg-card)] border border-[var(--border-color)] hover:shadow-md transition-all duration-300 overflow-hidden">

        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: config.cor }} />

        <div className="flex justify-between items-start gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]" style={{ color: config.cor }}>
              {config.label}
            </span>
            <h3 className="text-sm md:text-base font-black text-[var(--text-main)] leading-tight">
              {tarefa.titulo}
            </h3>
          </div>
          
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-500 shrink-0">
            <Zap size={12} fill="currentColor" />
            <span className="text-[11px] font-black uppercase tracking-wider">{config.pontos} pts</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 pt-3 border-t border-[var(--border-color)]">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5 text-[10px] font-bold opacity-60 text-[var(--text-main)]">
              <Clock size={12} /> {tarefa.dataAgendada ? new Date(tarefa.dataAgendada).toLocaleDateString('pt-BR') : 'Sem data'}
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold opacity-60 text-[var(--text-main)]">
              <User size={12} /> {tarefa.funcionarioResponsavel || 'Disponível para equipe'}
            </span>
          </div>

          <button 
            onClick={() => concluirTarefa(tarefa.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-transparent border border-[var(--border-color)] text-[var(--text-main)] hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-colors"
          >
            <CheckCircle size={14} /> Concluir
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full p-4 md:p-6 flex flex-col gap-6 bg-transparent">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-main)]">
            Mural de Tarefas
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-40 text-[var(--text-main)] mt-1">
            Cumpra atividades e ganhe pontos
          </p>
        </div>

        <button className="flex items-center gap-2 px-5 py-2.5 bg-[#DC2626] hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm">
          <Plus size={16} strokeWidth={3} /> Nova Tarefa
        </button>
      </div>

      {/*FILTROS*/}
      <div className="flex items-center gap-2 overflow-x-auto hide-scroll pb-2 shrink-0 border-b border-[var(--border-color)] border-opacity-50">
        <Filter size={14} className="opacity-40 text-[var(--text-main)] mr-2 shrink-0" />
        
        <button 
          onClick={() => setFiltroTipo(null)}
          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border whitespace-nowrap ${filtroTipo === null ? 'bg-[var(--text-main)] text-[var(--bg-body)] border-[var(--text-main)]' : 'bg-transparent text-[var(--text-main)] border-[var(--border-color)] opacity-60 hover:opacity-100'}`}
        >
          Todas
        </button>

        {Object.entries(TIPOS_TAREFA).map(([chave, config]) => (
          <button 
            key={chave}
            onClick={() => setFiltroTipo(chave)}
            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all border whitespace-nowrap`}
            style={{ 
              backgroundColor: filtroTipo === chave ? config.cor : 'transparent',
              color: filtroTipo === chave ? '#fff' : 'var(--text-main)',
              borderColor: filtroTipo === chave ? config.cor : 'var(--border-color)',
              opacity: filtroTipo === chave ? 1 : 0.6
            }}
          >
            {config.label}
          </button>
        ))}
      </div>

      {/*LISTAGEM*/}
      <div className="flex-1 overflow-y-auto hide-scroll pb-10">
        {carregando ? (
          <div className="flex items-center justify-center h-full opacity-50">
            <span className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] animate-pulse">Carregando mural...</span>
          </div>
        ) : tarefasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full border-2 border-dashed border-[var(--border-color)] rounded-[20px] bg-[var(--bg-card)] bg-opacity-30 p-10 text-center">
            <CheckCircle size={40} className="mb-4 text-emerald-500 opacity-50" />
            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">Mural Limpo!</h3>
            <p className="text-xs font-bold opacity-50 mt-1 text-[var(--text-main)] max-w-sm">
              Nenhuma tarefa pendente no momento. Bom trabalho!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tarefasFiltradas.map(tarefa => (
              <TarefaCard key={tarefa.id} tarefa={tarefa} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}