import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, CheckCircle2, Circle, 
  Printer, Loader2, RefreshCw, Check
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const extrairCnpj = (userObj) => {
  if (!userObj) return null;
  
  let doc = userObj?.empresa?.documentoNumero || userObj?.empresa?.cnpj || userObj?.documentoNumero;
  
  if (doc) {
    let limpo = String(doc).replace(/\D/g, '');
    if (limpo.length === 14) return limpo;
  }

  let encontrado = null;
  const buscar = (obj) => {
    if (encontrado) return;
    for (let key in obj) {
      if (obj[key] && typeof obj[key] === 'object') {
        buscar(obj[key]);
      } else if (typeof obj[key] === 'string' || typeof obj[key] === 'number') {
        let limpo = String(obj[key]).replace(/\D/g, '');
        if (limpo.length === 14 && !/^0+$/.test(limpo)) {
          encontrado = limpo;
        }
      }
    }
  };
  buscar(userObj);
  return encontrado;
};

export default function ListaCompras() {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  const getUsuarioLogado = () => { try { return JSON.parse(localStorage.getItem("usuario")) || {}; } catch { return {}; } };
  const usuarioLogado = getUsuarioLogado();
  const [loading, setLoading] = useState(true);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [produtosAbaixoEstoque, setProdutosAbaixoEstoque] = useState([]);
  const [itensMarcados, setItensMarcados] = useState(new Set());
  const [entradasRapidas, setEntradasRapidas] = useState({});
  const [salvandoEntrada, setSalvandoEntrada] = useState(null);
  const carregarListaNecessidade = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/produtos?page=0&size=200`, {
        headers: {
          "Authorization": `Bearer ${usuarioLogado.token}`,
          "id-operador": String(usuarioLogado.id || 1)
        }
      });
      if (!res.ok) throw new Error("Erro ao buscar estoque");
      const dados = await res.json();
      const rawArray = Array.isArray(dados) ? dados : (dados.content || []);

      const necessitamCompra = [];

      rawArray.forEach(produtoPai => {
        if (produtoPai.ativo && produtoPai.variacoes) {
          produtoPai.variacoes.forEach(variacao => {
            const qtdAtual = Number(variacao.estoqueAtual ?? variacao.estoqueInicial ?? 0);
            const qtdMinima = Number(variacao.estoqueMinimo ?? 5);
            if (qtdAtual <= qtdMinima) {
              necessitamCompra.push({
                idProduto: produtoPai.id,
                idUnico: variacao.id, 
                nomePai: produtoPai.nomeGenerico,
                nomeVariacao: variacao.nomeVariacao,
                categoria: produtoPai.categoria || produtoPai.nomeCategoria || "OUTROS",
                estoqueAtual: qtdAtual,
                estoqueMinimo: qtdMinima,
                faltante: qtdMinima - qtdAtual > 0 ? qtdMinima - qtdAtual : 1 
              });
            }
          });
        }
      });

      necessitamCompra.sort((a, b) => a.estoqueAtual - b.estoqueAtual);
      setProdutosAbaixoEstoque(necessitamCompra);

    } catch (error) {
      console.error("Falha ao gerar lista:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregarListaNecessidade(); }, []);

  const toggleItem = (idUnico) => {
    const novosMarcados = new Set(itensMarcados);
    novosMarcados.has(idUnico) ? novosMarcados.delete(idUnico) : novosMarcados.add(idUnico);
    setItensMarcados(novosMarcados);
  };

  const handleMudancaEntrada = (idUnico, valor) => {
    setEntradasRapidas(prev => ({ ...prev, [idUnico]: valor }));
  };

  const registrarEntradaRapida = async (e, item) => {
    e.stopPropagation(); 
    
    const quantidadeDigitada = Number(entradasRapidas[item.idUnico]);
    if (!quantidadeDigitada || quantidadeDigitada <= 0) {
      alert("Digite uma quantidade válida para dar entrada.");
      return;
    }

    setSalvandoEntrada(item.idUnico);
    
    try {
      const response = await fetch(`/api/produtos/variacoes/${item.idUnico}/entrada`, {
        method: "POST", 
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${usuarioLogado.token}`,
          "id-operador": String(usuarioLogado.id || 1)
        },
        body: JSON.stringify({ quantidadeAdicionada: quantidadeDigitada })
      });

      if (response.ok) {
        setEntradasRapidas(prev => {
          const newState = { ...prev };
          delete newState[item.idUnico];
          return newState;
        });
        
        const novosMarcados = new Set(itensMarcados);
        novosMarcados.add(item.idUnico);
        setItensMarcados(novosMarcados);
        
        carregarListaNecessidade();
      } else {
        alert("Erro ao registrar entrada no servidor.");
      }
    } catch (error) {
      alert("Falha de conexão.");
    } finally {
      setSalvandoEntrada(null);
    }
  };

  const gerarPDF = async () => {
    try {
      setGerandoPdf(true); 
      const doc = new jsPDF("portrait", "mm", "a4");
      
      const cnpjLimpo = extrairCnpj(usuarioLogado);

      let nomeFantasia = usuarioLogado?.empresa?.nomeFantasia || usuarioLogado?.empresa?.razaoSocial || "EMPRESA SEM NOME";
      let cnpjFormatado = "00.000.000/0001-00";
      let endereco = "Buscando endereço na Receita Federal...";
      let telefone = usuarioLogado?.empresa?.telefone || usuarioLogado?.telefone || "";

      if (cnpjLimpo && cnpjLimpo.length === 14) {
        cnpjFormatado = cnpjLimpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
        
        try {
          const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
          if (res.ok) {
             const data = await res.json();
             
             if (nomeFantasia === "EMPRESA SEM NOME") {
                 nomeFantasia = data.nome_fantasia || data.razao_social;
             }
            
             if (data.logradouro) {
                 endereco = `${data.logradouro}, ${data.numero}`;
                 if (data.complemento) endereco += ` - ${data.complemento}`;
                 endereco += ` - ${data.bairro} - ${data.municipio}/${data.uf}`;
             } else {
                 endereco = "Endereço não consta na base da Receita.";
             }
             
             if (!telefone && data.ddd_telefone_1) {
                 let tel = data.ddd_telefone_1.replace(/\D/g, "");
                 telefone = tel.length === 11 
                    ? tel.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3")
                    : tel.replace(/^(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
             }
          } else {
             endereco = "Falha ao buscar endereço na Receita Federal";
          }
        } catch (e) {
          endereco = "Endereço indisponível no momento";
        }
      } else {
        endereco = "Endereço não disponível (CNPJ não identificado)";
      }

      if (!telefone) telefone = "(00) 00000-0000";

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0); 
      doc.text(nomeFantasia.toUpperCase(), 14, 20);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`CNPJ: ${cnpjFormatado}`, 14, 25);
      doc.text(endereco, 14, 29);
      doc.text(`Tel: ${telefone}`, 14, 33);

      const dataEmissao = new Date().toLocaleString('pt-BR');
      const nomeUsuario = usuarioLogado.nomeCompleto || usuarioLogado.dono?.nomeCompleto || usuarioLogado.nome || 'Usuário do Sistema';
      
      doc.setFont("helvetica", "bold");
      doc.text(`Usuário: ${nomeUsuario.toUpperCase()}`, 130, 20);
      doc.text(`Emitido em: ${dataEmissao}`, 130, 25);
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 38, 196, 38);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO DE COMPRAS", 14, 48);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Reposição Automática de Estoque", 14, 53);
      doc.setFont("helvetica", "bold");
      doc.text(`Itens Totais: ${produtosAbaixoEstoque.length}`, 14, 59);
      doc.setTextColor(220, 38, 38); 
      doc.text(`Esgotados: ${produtosAbaixoEstoque.filter(i => i.estoqueAtual <= 0).length}`, 45, 59);
      doc.setTextColor(0, 0, 0); 

      const colunas = [["PRODUTO", "CATEGORIA", "ESTOQUE", "MÍNIMO", "SITUAÇÃO"]];
      const linhas = produtosAbaixoEstoque.map(item => [
        `${item.nomePai} ${item.nomeVariacao !== 'Único' ? '- ' + item.nomeVariacao : ''}`.toUpperCase(),
        item.categoria.toUpperCase(),
        item.estoqueAtual,
        item.estoqueMinimo,
        `REPOR ${item.faltante}`
      ]);

      autoTable(doc, {
        startY: 65,
        head: colunas,
        body: linhas,
        theme: 'grid', 
        headStyles: { 
          fillColor: [31, 41, 55],
          textColor: [255, 255, 255], 
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left'
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [55, 65, 81] 
        },
        columnStyles: {
          2: { halign: 'center' }, 
          3: { halign: 'center' }, 
          4: { halign: 'center', textColor: [220, 38, 38], fontStyle: 'bold' } 
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251] 
        }
      });

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text("Sistema CtrlBase", 14, 287);
        doc.text(`Página ${i} de ${pageCount}`, 180, 287);
      }

      doc.save("Relatorio_Compras.pdf");

    } catch (err) {
      alert("Falha ao gerar o PDF. Verifique se as dependências do jspdf estão instaladas no projeto.");
    } finally {
      setGerandoPdf(false); 
    }
  };

  return (
    <>
      <style>{`
        .custom-slim-scroll::-webkit-scrollbar { width: 5px; }
        .custom-slim-scroll::-webkit-scrollbar-thumb { background: rgba(150, 150, 150, 0.3); border-radius: 10px; }
      `}</style>

      <div className="flex flex-col w-full h-full font-sans animate-in fade-in duration-500 transition-colors bg-transparent gap-6 pb-10 lg:pb-0 px-3">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 mt-4 mb-2 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto shrink-0">
            <button 
              onClick={() => navigate(-1)} 
              className="p-1 transition-all hover:scale-110 hover:-translate-x-1 outline-none opacity-60 hover:opacity-100"
              style={{ color: 'var(--text-main)' }}
            >
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            
            <div className="flex flex-col">
              <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-tight leading-none" style={{ color: 'var(--bg-sidebar)' }}>
                Lista de Compras
              </h1>
              <p className="text-[9px] mt-1 font-bold uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>
                Reposição Automática de Estoque
              </p>
            </div>
          </div>

          <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
            <button 
              onClick={gerarPDF} 
              disabled={gerandoPdf}
              className="flex-1 md:flex-none py-3 px-6 rounded-xl text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 outline-none"
              style={{ backgroundColor: 'var(--bg-sidebar)' }}
            >
              {gerandoPdf ? <Loader2 size={16} strokeWidth={2.5} className="animate-spin" /> : <Printer size={16} strokeWidth={2.5} />}
              {gerandoPdf ? "Gerando..." : "Imprimir PDF"}
            </button>
            
            <button 
              onClick={carregarListaNecessidade} 
              className="flex-1 md:flex-none py-3 px-6 rounded-xl text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 transition-all outline-none" 
              style={{ backgroundColor: 'var(--bg-sidebar)' }}
            >
              <RefreshCw size={16} strokeWidth={2.5} className={loading ? "animate-spin" : ""} /> Atualizar
            </button>
          </div>
        </header>

        {/* PAINEL PRINCIPAL DA LISTAGEM CRÍTICA */}
        <main className="flex-1 rounded-2xl border shadow-sm flex flex-col min-h-0 transition-colors" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="p-5 border-b flex justify-between items-center shrink-0" style={{ borderColor: 'var(--border-color)' }}>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40" style={{ color: 'var(--text-main)' }}>
              {produtosAbaixoEstoque.length} Variações com estoque crítico
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-slim-scroll bg-transparent">
            {loading ? (
              <div className="flex h-full items-center justify-center flex-col gap-4 opacity-50">
                <Loader2 className="animate-spin" style={{ color: 'var(--bg-sidebar)' }} size={40} />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>Analisando o Inventário...</span>
              </div>
            ) : produtosAbaixoEstoque.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-40 text-center transition-colors" style={{ color: 'var(--text-main)' }}>
                <CheckCircle2 size={64} className="mb-4 opacity-50" />
                <p className="font-black uppercase tracking-widest text-[11px]">Estoque 100% Abastecido!</p>
                <p className="text-[9px] font-bold tracking-widest opacity-50 mt-1">Nenhum produto atingiu a quantidade mínima.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {produtosAbaixoEstoque.map((item) => {
                  const isChecked = itensMarcados.has(item.idUnico);
                  
                  return (
                    <div 
                      key={`ui-${item.idUnico}`}
                      onClick={() => toggleItem(item.idUnico)}
                      className={`p-4 sm:p-5 rounded-2xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 
                        ${isChecked ? 'opacity-40' : 'hover:-translate-y-0.5 shadow-sm hover:shadow-md hover:border-[var(--text-main)]'}
                      `}
                      style={{ backgroundColor: isChecked ? 'transparent' : 'var(--bg-body)', borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="shrink-0 transition-colors" style={{ color: isChecked ? '#22c55e' : 'var(--text-main)' }}>
                          {isChecked ? <CheckCircle2 size={24} /> : <Circle size={24} className="opacity-20" />}
                        </div>
                        
                        <div className="flex flex-col">
                          <h3 className="font-black uppercase tracking-tight text-sm truncate" style={{ color: 'var(--text-main)' }}>
                            {item.nomePai} <span className="opacity-50 ml-1 font-bold">- {item.nomeVariacao}</span>
                          </h3>
                          <p className="text-[9px] font-black opacity-40 uppercase tracking-widest mt-1" style={{ color: 'var(--text-main)' }}>
                            Categoria: {item.categoria}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-row items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t sm:border-t-0 pt-4 sm:pt-0" style={{ borderColor: 'var(--border-color)' }}>
                        
                        <div className="text-left sm:text-right flex flex-col items-start sm:items-end">
                          <span className="text-[10px] font-black px-3 py-1 rounded-[6px] bg-red-500/10 text-red-500 border border-red-500/20 uppercase tracking-widest">
                            ESTOQUE: {item.estoqueAtual}
                          </span>
                          <p className="text-[9px] font-bold opacity-40 mt-1.5 uppercase tracking-widest" style={{ color: 'var(--text-main)' }}>
                            Mínimo Permitido: {item.estoqueMinimo}
                          </p>
                        </div>

                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="number" 
                            min="1"
                            placeholder="+Qtd"
                            value={entradasRapidas[item.idUnico] || ''}
                            onChange={(e) => handleMudancaEntrada(item.idUnico, e.target.value)}
                            className="w-16 h-10 text-center text-xs font-bold rounded-xl border outline-none focus:border-current transition-all shadow-sm"
                            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                          />
                          <button 
                            onClick={(e) => registrarEntradaRapida(e, item)}
                            disabled={!entradasRapidas[item.idUnico] || salvandoEntrada === item.idUnico}
                            className="h-10 w-10 rounded-xl flex items-center justify-center transition-all shadow-md disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 text-white outline-none"
                            style={{ backgroundColor: 'var(--bg-sidebar)' }}
                          >
                            {salvandoEntrada === item.idUnico ? <Loader2 size={16} className="animate-spin" /> : <Check size={18} strokeWidth={3} />}
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}