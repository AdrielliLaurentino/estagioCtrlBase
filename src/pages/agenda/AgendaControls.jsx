import React from 'react';
import { ChevronLeft, ChevronRight, Filter, LayoutGrid, List, ChevronDown } from "lucide-react";

export default function AgendaControls({ 
    data, onMudarData, vista, onSetVista, filtros, onSetFiltros, 
    layout, onSetLayout, funcionarios, isAdmin, usuarioLogado 
}) {
    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-3 md:px-5 flex flex-col xl:flex-row justify-between items-center gap-4 shadow-sm mx-1">
            {/* Navegação de Datas */}
            <div className="flex items-center gap-1 text-[var(--text-main)]">
                <button onClick={() => onMudarData(-1)} className="p-2 rounded-lg hover:bg-black/5"><ChevronLeft size={18}/></button>
                <span className="min-w-[140px] text-center font-semibold text-sm capitalize">
                    {new Intl.DateTimeFormat('pt-BR', vista === "mes" ? { month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long', year: 'numeric' }).format(data)}
                </span>
                <button onClick={() => onMudarData(1)} className="p-2 rounded-lg hover:bg-black/5"><ChevronRight size={18}/></button>
            </div>

            {/* Ações e Filtros */}
            <div className="flex items-center gap-4">
                {vista === "semana" && (
                    <div className="flex p-1 rounded-lg border border-[var(--border-color)]">
                        <button onClick={() => onSetLayout("colunas")} className={`p-1.5 ${layout === "colunas" ? 'bg-gray-100' : ''}`}><LayoutGrid size={16}/></button>
                        <button onClick={() => onSetLayout("lista")} className={`p-1.5 ${layout === "lista" ? 'bg-gray-100' : ''}`}><List size={16}/></button>
                    </div>
                )}
                {/* Botões de Vista (Mês/Semana/Dia) */}
                <div className="flex p-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-body)]">
                    {['mes', 'semana', 'dia'].map(v => (
                        <button key={v} onClick={() => onSetVista(v)} className={`px-4 py-1.5 rounded-md text-xs font-semibold ${vista === v ? 'bg-[var(--bg-card)] shadow-sm' : 'opacity-60'}`}>
                            {v.charAt(0).toUpperCase() + v.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}