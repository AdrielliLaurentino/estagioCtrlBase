import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

const CarrinhoContext = createContext();

export function CarrinhoProvider({ children }) {
  const [itens, setItens] = useState([]);
  const [cliente, setCliente] = useState(null);

  const adicionarAoCarrinho = useCallback((produto) => {
    setItens((prev) => {
      const idBase = produto.id || produto.produtoId;
      const varBase = produto.nomeVariacao || produto.variacaoId || 'padrao';
      const chaveBusca = `${idBase}-${varBase}`;

      const existe = prev.find((i) => i.chaveBusca === chaveBusca);
      
      if (existe) {
        return prev.map((i) => 
          i.chaveBusca === chaveBusca 
            ? { ...i, quantidade: i.quantidade + 1 } 
            : i
        );
      }

      const precoFinal = parseFloat(produto.precoVenda || produto.precoBase || produto.preco || produto.valor || 0);
      const nomeFinal = produto.nomeCompleto || produto.nomeCompletoConcatenado || produto.nomeGenerico || produto.nome || "Produto Selecionado";

      const novoItemId = typeof crypto !== 'undefined' && crypto.randomUUID 
        ? crypto.randomUUID() 
        : `${Date.now()}-${Math.random().toString(36).substring(2)}`;
        
      return [...prev, { 
        ...produto, 
        chaveBusca,
        nomeGenerico: nomeFinal,
        preco: precoFinal,
        quantidade: 1, 
        carrinhoItemId: novoItemId 
      }];
    });
  }, []);

  const removerDoCarrinho = useCallback((carrinhoItemId) => {
    setItens((prev) => prev.filter((i) => i.carrinhoItemId !== carrinhoItemId));
  }, []);

  const atualizarQuantidade = useCallback((carrinhoItemId, delta) => {
    setItens((prev) =>
      prev.map((i) =>
        i.carrinhoItemId === carrinhoItemId
          ? { ...i, quantidade: Math.max(1, i.quantidade + delta) }
          : i
      )
    );
  }, []);

  const limparCarrinho = useCallback(() => {
    setItens([]);
    setCliente(null);
  }, []);

  const subtotal = useMemo(() => 
    itens.reduce((acc, i) => acc + ((i.preco || 0) * i.quantidade), 0), 
  [itens]);

  const value = useMemo(() => ({
    itens,
    cliente,
    setCliente,
    subtotal,
    adicionarAoCarrinho,
    removerDoCarrinho,
    atualizarQuantidade,
    limparCarrinho
  }), [
    itens, 
    cliente, 
    subtotal, 
    adicionarAoCarrinho, 
    removerDoCarrinho, 
    atualizarQuantidade, 
    limparCarrinho
  ]);

  return <CarrinhoContext.Provider value={value}>{children}</CarrinhoContext.Provider>;
}

export function useCarrinho() {
  const context = useContext(CarrinhoContext);
  if (!context) throw new Error("useCarrinho deve ser usado dentro de um CarrinhoProvider");
  return context;
}