import React, { useState, useEffect } from 'react';

export default function AdminComissoesPage() {
  const [funcionarios, setFuncionarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [funcionarioEmEdicao, setFuncionarioEmEdicao] = useState(null);

  useEffect(() => {
    const fetchDados = async () => {
      setIsLoading(true);
      try {
        const mockData = [
          {
            id: 1,
            nome: "Ana Silva",
            cargo: "Vendedora",
            recebeComissao: true,
            comissaoPorMeta: true,
            percentualFixo: null,
            valorVendidoMes: 2850.00,
            valorComissaoAcumulado: 85.50
          },
          {
            id: 2,
            nome: "Carlos Mendes",
            cargo: "Vendedor",
            recebeComissao: true,
            comissaoPorMeta: false,
            percentualFixo: 0.05,
            valorVendidoMes: 1200.00,
            valorComissaoAcumulado: 60.00
          },
          {
            id: 3,
            nome: "Roberto Alves",
            cargo: "Estoque",
            recebeComissao: false,
            comissaoPorMeta: false,
            percentualFixo: null,
            valorVendidoMes: 0,
            valorComissaoAcumulado: 0
          }
        ];
        
        setTimeout(() => {
          setFuncionarios(mockData);
          setIsLoading(false);
        }, 800);
      } catch (error) {
        console.error("Erro ao buscar dados:", error);
        setIsLoading(false);
      }
    };

    fetchDados();
  }, []);

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor || 0);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto text-gray-800 font-sans">
      {/* Cabeçalho */}
      <header className="mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-gray-900">Comissões</h1>
          <p className="text-sm text-gray-500 mt-1">
            Acompanhamento de metas e saldos acumulados da equipe.
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Mês Vigente</p>
          <p className="text-lg font-semibold text-gray-700">Abril / 2026</p>
        </div>
      </header>

      {/* Tabela */}
      <main className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">Carregando dados...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                <th className="p-4 font-medium">Funcionário</th>
                <th className="p-4 font-medium">Regra Atual</th>
                <th className="p-4 text-right font-medium">Vendido (Mês)</th>
                <th className="p-4 text-right font-medium">A Receber</th>
                <th className="p-4 text-center font-medium">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {funcionarios.map((func) => (
                <tr key={func.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-gray-800">{func.nome}</div>
                    <div className="text-xs text-gray-400">{func.cargo}</div>
                  </td>
                  <td className="p-4">
                    {!func.recebeComissao ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        Inativo
                      </span>
                    ) : func.comissaoPorMeta ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
                        Metas Progressivas
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-50 text-purple-600">
                        Fixo ({(func.percentualFixo * 100).toFixed(1)}%)
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-right text-sm text-gray-600">
                    {formatarMoeda(func.valorVendidoMes)}
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-semibold text-emerald-600">
                      {formatarMoeda(func.valorComissaoAcumulado)}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      onClick={() => setFuncionarioEmEdicao(func)}
                      className="text-xs font-medium text-gray-500 hover:text-black transition-colors underline underline-offset-4"
                    >
                      Configurar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>

      {/* Side Panel */}
      {funcionarioEmEdicao && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/20 backdrop-blur-sm transition-opacity">
          <div className="bg-white w-full max-w-md h-full shadow-2xl p-8 animate-slide-in-right flex flex-col">
            
            <header className="mb-8 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-medium text-gray-900">Configurar Regras</h2>
                <p className="text-sm text-gray-500">{funcionarioEmEdicao.nome}</p>
              </div>
              <button 
                onClick={() => setFuncionarioEmEdicao(null)}
                className="text-gray-400 hover:text-gray-800 text-2xl leading-none"
              >
                &times;
              </button>
            </header>

            <form className="flex-1 overflow-y-auto pr-2 space-y-6">
              {/* Toggle de Ativação */}
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700">Participa de Comissões?</span>
                <input 
                  type="checkbox" 
                  defaultChecked={funcionarioEmEdicao.recebeComissao}
                  className="w-5 h-5 rounded border-gray-300 text-black focus:ring-black accent-black"
                />
              </label>

              <hr className="border-gray-100" />

              {/* Seleção do Tipo */}
              <div className="space-y-3">
                <span className="text-sm font-medium text-gray-700 block">Modelo de Cálculo</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input 
                      type="radio" 
                      name="tipoRegra" 
                      defaultChecked={funcionarioEmEdicao.comissaoPorMeta}
                      className="accent-black"
                    />
                    Metas Progressivas
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input 
                      type="radio" 
                      name="tipoRegra" 
                      defaultChecked={!funcionarioEmEdicao.comissaoPorMeta}
                      className="accent-black"
                    />
                    Percentual Fixo
                  </label>
                </div>
              </div>

              <hr className="border-gray-100" />

              {/* Filtros */}
              <div className="space-y-4">
                <span className="text-sm font-medium text-gray-700 block">Filtros de Venda</span>
                <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded accent-black" />
                  Incluir vendas no Crediário
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer">
                  <input type="checkbox" defaultChecked className="rounded accent-black" />
                  Incluir vendas com Voucher/Desconto
                </label>
              </div>

            </form>

            <footer className="pt-6 border-t border-gray-100 flex justify-end gap-4 mt-auto">
              <button 
                onClick={() => setFuncionarioEmEdicao(null)}
                className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-black transition-colors"
              >
                Cancelar
              </button>
              <button 
                className="px-6 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800 transition-colors shadow-md"
              >
                Salvar Alterações
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}