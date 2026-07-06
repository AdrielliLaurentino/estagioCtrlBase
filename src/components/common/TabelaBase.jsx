import React, { useState, useEffect } from "react";
import { LayoutGrid, ListIcon, MoreVertical, Edit2, Trash2, PowerOff } from "lucide-react";
import ModalConfirmacao from "../modal/ModalConfirmacao"; 

const MenuAcoesDropdown = ({ item, rowIdx, menuAberto, setMenuAberto, onEditar, onInativar, onRemover, abrirModal }) => (
  <div className="relative inline-block text-left shrink-0" onClick={(e) => e.stopPropagation()}>
    <button 
      onClick={(e) => { 
        e.stopPropagation(); 
        setMenuAberto(menuAberto === rowIdx ? null : rowIdx); 
      }} 
      className="p-1 opacity-50 hover:opacity-100 rounded-full transition-colors outline-none"
    >
      <MoreVertical size={18} />
    </button>

    {menuAberto === rowIdx && (
      <div className="absolute right-0 top-8 mt-1 w-36 rounded-xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-top-2 duration-200 bg-[var(--bg-card)] border-[var(--border-color)] border">
        {onEditar && (
          <button 
            onClick={(e) => { e.stopPropagation(); setMenuAberto(null); onEditar(item); }} 
            className="w-full px-4 py-3 text-left text-[10px] font-bold uppercase flex items-center gap-3 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            <Edit2 size={12} /> Editar
          </button>
        )}
        {onInativar && (
          <button 
            onClick={(e) => { e.stopPropagation(); setMenuAberto(null); abrirModal("inativar", item); }} 
            className="w-full px-4 py-3 text-left text-[10px] font-bold uppercase flex items-center gap-3 transition-colors hover:bg-black/5 dark:hover:bg-white/10 border-t border-[var(--border-color)]"
          >
            <PowerOff size={12} className="text-orange-500"/> Ativar / Inat.
          </button>
        )}
        {onRemover && (
          <button 
            onClick={(e) => { e.stopPropagation(); setMenuAberto(null); abrirModal("remover", item); }} 
            className="w-full px-4 py-3 text-left text-[10px] font-bold uppercase flex items-center gap-3 transition-colors hover:bg-red-500/10 border-t border-[var(--border-color)] text-red-500"
          >
            <Trash2 size={12} /> Excluir
          </button>
        )}
      </div>
    )}
  </div>
);

export default function TabelaBase({ 
  dados = [], 
  colunas = [], 
  onEditar, 
  onRemover, 
  onInativar,
  onLinhaClick,
  initialMode = "tabela" 
}) {
  const [modoVisao, setModoVisao] = useState(initialMode);
  const [menuAberto, setMenuAberto] = useState(null);
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    acao: null,
    item: null,
  });

  useEffect(() => {
    const handleWindowClick = () => setMenuAberto(null);
    if (menuAberto !== null) {
      window.addEventListener('click', handleWindowClick);
    }
    return () => window.removeEventListener('click', handleWindowClick);
  }, [menuAberto]);

  const possuiAcoes = !!(onEditar || onRemover || onInativar);

  const abrirModalConfirmacao = (acao, item) => {
    setModalConfig({ isOpen: true, acao, item });
  };

  const handleConfirmarAcao = () => {
    if (modalConfig.acao === "remover" && onRemover) {
      onRemover(modalConfig.item);
    } else if (modalConfig.acao === "inativar" && onInativar) {
      onInativar(modalConfig.item);
    }
    setModalConfig({ isOpen: false, acao: null, item: null });
  };

  return (
    <div className="w-full h-full flex flex-col bg-transparent text-[var(--text-main)]">
      
      <div className="flex justify-between items-center mb-6 px-2">
        <span className="text-[11px] font-bold uppercase tracking-widest opacity-70">
           {dados.length} {dados.length === 1 ? 'REGISTRO' : 'REGISTROS'}
        </span>
        
        <button 
            onClick={() => setModoVisao(modoVisao === "tabela" ? "cards" : "tabela")} 
            className="p-1.5 rounded-lg transition-all hover:brightness-90 dark:hover:brightness-110 border bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-main)]"
            title={modoVisao === "tabela" ? "Mudar para Cards" : "Mudar para Tabela"}
        >
            {modoVisao === "tabela" ? <LayoutGrid size={16} /> : <ListIcon size={16} />}
        </button>
      </div>

      {modoVisao === "tabela" && (
        <div className="flex-1 overflow-auto custom-slim-scroll w-full pb-10 px-2">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[var(--bg-table-header)] text-[var(--text-main)]">
                {colunas.map((col, idx) => (
                  <th 
                    key={idx} 
                    className={`py-4 px-6 text-[10px] font-bold uppercase tracking-widest 
                      first:rounded-tl-xl
                      ${!possuiAcoes && idx === colunas.length - 1 ? 'rounded-tr-xl' : ''}
                      ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {col.titulo}
                  </th>
                ))}
                {possuiAcoes && (
                  <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-center w-16 rounded-tr-xl">
                    Ações
                  </th>
                )}
              </tr>
            </thead>
            
            <tbody>
              {dados.map((item, rowIdx) => (
                <tr 
                  key={rowIdx} 
                  onClick={() => onLinhaClick && onLinhaClick(item)}
                  className={`transition-colors duration-200 bg-[var(--bg-body)] hover:bg-[var(--bg-card)] border-b border-opacity-10 border-[var(--text-main)] ${onLinhaClick ? 'cursor-pointer' : ''}`}
                >
                  {colunas.map((col, colIdx) => (
                    <td 
                      key={colIdx} 
                      className={`py-4 px-6 align-middle text-sm font-medium
                        ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}
                    >
                      {col.render ? col.render(item) : item[col.campo]}
                    </td>
                  ))}
                  
                  {possuiAcoes && (
                    <td className="py-4 px-6 align-middle text-center">
                       <MenuAcoesDropdown 
                          item={item} 
                          rowIdx={rowIdx} 
                          menuAberto={menuAberto}
                          setMenuAberto={setMenuAberto}
                          onEditar={onEditar}
                          onInativar={onInativar}
                          onRemover={onRemover}
                          abrirModal={abrirModalConfirmacao}
                       />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modoVisao === "cards" && (
        <div className="flex-1 overflow-auto custom-slim-scroll w-full pb-10 px-2">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {dados.map((item, rowIdx) => (
                 <div 
                   key={rowIdx}
                   onClick={() => onLinhaClick && onLinhaClick(item)}
                   className={`flex flex-col p-5 rounded-[20px] transition-all duration-300 hover:-translate-y-1 bg-[var(--bg-body)] hover:bg-[var(--bg-card)] border border-[var(--border-color)] ${onLinhaClick ? 'cursor-pointer' : ''}`}
                 >
                    <div className="flex justify-between items-start mb-4 border-b border-[var(--border-color)] pb-4">
                        <div className="flex-1 font-bold text-base">
                           {colunas[0]?.render ? colunas[0].render(item) : item[colunas[0]?.campo]}
                        </div>
                        
                        {possuiAcoes && (
                          <div className="ml-2">
                            <MenuAcoesDropdown 
                              item={item} 
                              rowIdx={rowIdx} 
                              menuAberto={menuAberto}
                              setMenuAberto={setMenuAberto}
                              onEditar={onEditar}
                              onInativar={onInativar}
                              onRemover={onRemover}
                              abrirModal={abrirModalConfirmacao}
                            />
                          </div>
                        )}
                    </div>
                    
                    <div className="flex flex-col gap-3">
                       {colunas.slice(1).map((col, colIdx) => (
                          <div key={colIdx} className="flex justify-between items-center text-sm">
                             <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">
                                {col.titulo}
                             </span>
                             <div className="font-medium text-right max-w-[60%] truncate">
                                {col.render ? col.render(item) : item[col.campo]}
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      <ModalConfirmacao 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ isOpen: false, acao: null, item: null })}
        onConfirm={handleConfirmarAcao}
        titulo={modalConfig.acao === "remover" ? "Confirmar Exclusão" : "Confirmar Alteração"}
        mensagem={
          modalConfig.acao === "remover" 
            ? "Tem certeza que deseja excluir este registro permanentemente? Esta ação não pode ser desfeita."
            : "Tem certeza que deseja alterar o status (ativar/inativar) deste registro?"
        }
        textoBotaoConfirmar={modalConfig.acao === "remover" ? "Sim, Excluir" : "Confirmar"}
        textoBotaoCancelar="Cancelar"
      />
    </div>
  );
}