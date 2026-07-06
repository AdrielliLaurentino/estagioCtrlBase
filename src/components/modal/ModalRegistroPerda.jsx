import React, { useState, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import ModalLateral from "../common/ModalLateral"; 
import { apiFetch } from "../../services/api";

import { Autocomplete, Input } from "./ModalRegistroEntrada";

export default function ModalRegistroPerda({ isOpen, onClose, onSalvo }) {
  const [loading, setLoading] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [variacaoSelecionada, setVariacaoSelecionada] = useState("");
  const [motivo, setMotivo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [errosBackend, setErrosBackend] = useState([]);

  const handleSelecionarProduto = useCallback((produto) => {
    setProdutoSelecionado(produto);
    setVariacaoSelecionada("");
    setErrosBackend([]);
  }, []);

  const handleSalvar = async (e, fecharModalComAnimacao) => {
    e.preventDefault();
    setErrosBackend([]);

    if (!produtoSelecionado || !quantidade || !motivo) {
      setErrosBackend([{ campo: "Validação", mensagem: "Preencha todos os campos obrigatórios." }]);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        idProduto: Number(produtoSelecionado.id || produtoSelecionado.idProduto),
        idVariacao: variacaoSelecionada ? Number(variacaoSelecionada) : null,
        quantidade: parseInt(quantidade, 10),
        motivo: motivo
      };
      
      await apiFetch("/api/estoque/perda", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if(onSalvo) onSalvo();
      fecharModalComAnimacao();

    } catch (error) {
      setErrosBackend([{ campo: "Erro", mensagem: error.message || "Falha ao registrar a perda." }]);
    } finally {
      setLoading(false);
    }
  };

  const isDesabilitado = loading || !produtoSelecionado || !quantidade || !motivo;

  return (
    <ModalLateral 
      isOpen={isOpen} 
      onClose={onClose} 
      titulo="Registro de Perda"
      subtitulo="Avaria ou Vencimento"
      icone={<AlertTriangle size={36} style={{ color: 'var(--text-main)' }} />}
      footer={(fechar) => (
        <>
          <button type="button" onClick={fechar} className="flex-1 py-8 flex justify-center items-center opacity-50 hover:opacity-100 transition-all group outline-none" style={{ color: 'var(--text-main)' }}>
              <span className="font-black uppercase text-sm tracking-widest group-hover:scale-105 transition-transform">Cancelar</span>
          </button>
          <button type="button" disabled={isDesabilitado} onClick={(e) => handleSalvar(e, fechar)} className="flex-1 py-8 flex justify-center items-center gap-2 transition-all disabled:opacity-30 outline-none group bg-black/10 hover:bg-black/20" style={{ color: 'var(--text-main)' }}>
              {loading && <Loader2 size={18} className="animate-spin" />} 
              <span className="font-black uppercase text-sm tracking-widest group-hover:scale-105 transition-transform">Confirmar Baixa</span>
          </button>
        </>
      )}
    >
        {errosBackend.length > 0 && (
          <div className="mb-6 p-5 rounded-[20px] bg-black/20 border border-white/20 flex flex-col gap-2 transition-all animate-in fade-in slide-in-from-top-2">
            <h4 className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
              <AlertTriangle size={14} /> Atenção aos Erros
            </h4>
            <ul className="pl-6 list-disc text-xs font-bold space-y-1" style={{ color: 'var(--text-main)' }}>
              {errosBackend.map((erro, index) => (
                <li key={index}><span className="opacity-70">{erro.campo}:</span> {erro.mensagem}</li>
              ))}
            </ul>
          </div>
        )}

        <form id="form-perda" autoComplete="off" className="flex flex-col gap-8">
          <Autocomplete label="Buscar Produto *" value={produtoSelecionado?.nomeGenerico || ""} onSelect={handleSelecionarProduto} obrigatorio />

          {produtoSelecionado && produtoSelecionado.variacoes?.length > 0 && (
            <div className="relative w-full border-b border-white/40 transition-all group focus-within:border-white pt-5">
              <label className="absolute left-0 top-0 text-[10px] font-black uppercase italic tracking-tighter opacity-100" style={{ color: 'var(--text-main)' }}>Selecione a Variação *</label>
              <select 
                required
                value={variacaoSelecionada}
                onChange={e => setVariacaoSelecionada(e.target.value)}
                className="w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 appearance-none transition-all" 
                style={{ color: 'var(--text-main)' }}
              >
                <option value="" disabled hidden className="text-black">Escolha...</option>
                {produtoSelecionado.variacoes.map(v => (
                  <option key={v.id} value={v.id} className="text-black">{v.nomeVariacao}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <Input label="Qtd. Perdida *" type="number" step="1" value={quantidade} onChange={setQuantidade} obrigatorio />
            
            <div className="relative w-full border-b border-white/40 transition-all group focus-within:border-white pt-5">
              <label className="absolute left-0 top-0 text-[10px] font-black uppercase italic tracking-tighter opacity-100" style={{ color: 'var(--text-main)' }}>Motivo *</label>
              <select 
                required
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                className="w-full bg-transparent outline-none text-sm font-bold pb-2 pt-1 appearance-none transition-all" 
                style={{ color: 'var(--text-main)' }}
              >
                <option value="" disabled hidden className="text-black">Selecione...</option>
                <option value="DEFEITO" className="text-black">Defeito de Fabrico</option>
                <option value="VENCIMENTO" className="text-black">Prazo de Validade</option>
                <option value="AVARIA" className="text-black">Avaria / Quebra</option>
              </select>
            </div>
          </div>
        </form>
    </ModalLateral>
  );
}