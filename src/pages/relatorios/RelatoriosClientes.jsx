import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, RefreshCw, AlertCircle, FileText, Table as TableIcon,
  ListIcon, PieChart as PieChartIcon, Star, UserMinus, Gift, ChevronDown, Box, 
  CalendarDays
} from "lucide-react";

import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";

import { gerarTemplateRelatorio } from "../../utils/geradorPdf";
import logoImage from "../../assets/icons/logobase.png";

const MODULO_CLIENTES = [
  { id: 'top_clientes', nome: 'Top Clientes (Curva ABC)', icone: Star },
  { id: 'inativos', nome: 'Inativos (Retenção)', icone: UserMinus },
  { id: 'aniversariantes', nome: 'Aniversariantes', icone: Gift }
];

const CORES_PIE = ['var(--bg-sidebar)', '#F97316', '#10B981', '#3B82F6', '#8B5CF6', '#64748B'];

const OPCOES_PERIODO_GERAL = [
  { id: 'ESTA_SEMANA', label: 'Esta Semana' },
  { id: 'ESTE_MES', label: 'Este Mês' },
  { id: 'MES_PASSADO', label: 'Mês Passado' },
  { id: 'CUSTOM', label: 'Personalizado' }
];

const OPCOES_PERIODO_ANIVERSARIO = [
  { id: 'HOJE', label: 'Aniversariantes Hoje' },
  { id: 'AMANHA', label: 'Aniversariantes Amanhã' },
  { id: 'ESTE_MES', label: 'Mês de Referência' }
];

const formatarMoeda = (valor = 0) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);

const getIsoDate = (d) => {
    if (!d || isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const parseDataNascimentoBackend = (dataRaw) => {
  if (!dataRaw) return "N/I";
  if (Array.isArray(dataRaw)) {
      if (dataRaw.length >= 3) return `${String(dataRaw[2]).padStart(2, '0')}/${String(dataRaw[1]).padStart(2, '0')}/${dataRaw[0]}`;
      return "N/I";
  }
  const str = String(dataRaw);
  if (str.includes('-')) {
    const partes = str.split('-');
    if (partes[0].length === 2) return `${partes[0]}/${partes[1]}/${partes[2]}`;
    if (partes[0].length === 4) return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return str;
};

const obterDiaMes = (dataRaw) => {
    if (!dataRaw) return { dia: 0, mes: 0, ano: 0 };
    if (Array.isArray(dataRaw) && dataRaw.length >= 3) {
        return { dia: parseInt(dataRaw[2], 10), mes: parseInt(dataRaw[1], 10), ano: parseInt(dataRaw[0], 10) };
    }
    const str = String(dataRaw);
    if (str.includes('-')) {
        const p = str.split('T')[0].split('-');
        if (p.length === 3) {
            if (p[0].length === 2) return { dia: parseInt(p[0], 10), mes: parseInt(p[1], 10), ano: parseInt(p[2], 10) };
            if (p[0].length === 4) return { dia: parseInt(p[2], 10), mes: parseInt(p[1], 10), ano: parseInt(p[0], 10) };
        }
    }
    return { dia: 0, mes: 0, ano: 0 };
};

export default function RelatoriosClientes() {
  const navigate = useNavigate();
  const location = useLocation();
  const [usuario, setUsuario] = useState({}); 
  const [unidade, setUnidade] = useState({});
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPeriodoModal, setShowPeriodoModal] = useState(false);
  const backEndDisponivel = useRef(true);
  
  const [filtros, setFiltros] = useState(() => {
    const hoje = new Date();
    const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const ultimoDia = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    return {
      subRelatorio: location.state?.abaAtiva || MODULO_CLIENTES[0].id,
      modoVisao: "tabela",
      periodoAcesso: "ESTE_MES", 
      dataInicio: getIsoDate(primeiroDia),
      dataFim: getIsoDate(ultimoDia)
    };
  });
  
  const [req, setReq] = useState({ loading: false, erro: null });
  const [dados, setDados] = useState({ tabela: [], resumo: { totalClientes: 0, kpiSecundario: 0, kpiTerceiro: 0 }});

  useEffect(() => {
    try { setUsuario(JSON.parse(localStorage.getItem("usuario")) || {}); } catch { setUsuario({}); }
  }, []);

  const headersPadrao = useMemo(() => ({
    "Content-Type": "application/json",
    "Authorization": `Bearer ${usuario.token || ""}`,
    "id-operador": String(usuario.id || usuario.idFuncionario || 1)
  }), [usuario]);

  useEffect(() => {
    const fetchUnidade = async () => {
      try {
        const id = usuario.unidadeId || usuario.idUnidade || 1;
        const res = await fetch(`/api/unidades/${id}`, { headers: headersPadrao });
        if (res.ok) setUnidade(await res.json());
      } catch (e) {}
    };
    if (usuario.token) fetchUnidade();
  }, [usuario.token, headersPadrao]);

  useEffect(() => {
    const handleClickFora = (e) => {
      if (!e.target.closest('.modal-container-export')) setShowExportMenu(false);
      if (!e.target.closest('.modal-container-periodo')) setShowPeriodoModal(false);
    };
    document.addEventListener('click', handleClickFora);
    return () => document.removeEventListener('click', handleClickFora);
  }, []);

  useEffect(() => {
    if (filtros.subRelatorio === 'aniversariantes' && !['HOJE', 'AMANHA', 'ESTE_MES'].includes(filtros.periodoAcesso)) {
        setFiltros(prev => ({ ...prev, periodoAcesso: 'HOJE' }));
    } else if (filtros.subRelatorio !== 'aniversariantes' && ['HOJE', 'AMANHA'].includes(filtros.periodoAcesso)) {
        setFiltros(prev => ({ ...prev, periodoAcesso: 'ESTE_MES' }));
    }
  }, [filtros.subRelatorio, filtros.periodoAcesso]);

  const aplicarPeriodoRapido = useCallback((idPeriodo) => {
    const hoje = new Date();
    let dInicio = new Date();
    let dFim = new Date();

    if (idPeriodo === 'ESTA_SEMANA') {
        dInicio.setDate(hoje.getDate() - hoje.getDay()); 
    } else if (idPeriodo === 'ESTE_MES') {
        dInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        dFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    } else if (idPeriodo === 'MES_PASSADO') {
        dInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        dFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
    } 

    setFiltros(prev => ({ 
      ...prev, 
      periodoAcesso: idPeriodo, 
      dataInicio: idPeriodo === 'CUSTOM' || idPeriodo === 'HOJE' || idPeriodo === 'AMANHA' ? prev.dataInicio : getIsoDate(dInicio),
      dataFim: idPeriodo === 'CUSTOM' || idPeriodo === 'HOJE' || idPeriodo === 'AMANHA' ? prev.dataFim : getIsoDate(dFim)
    }));
  }, []);

  const alterarFiltro = (chave, valor) => setFiltros(prev => ({ ...prev, [chave]: valor }));

  const fetchData = useCallback(async () => {
    if (!backEndDisponivel.current) return;
    setReq({ loading: true, erro: null });
    
    try {
      const [resClientes, resVendas] = await Promise.all([
        fetch(`/api/clientes`, { headers: headersPadrao }), 
        fetch(`/api/vendas?status=REALIZADA&periodo=${filtros.periodoAcesso}&inicio=${filtros.dataInicio}&fim=${filtros.dataFim}`, { headers: headersPadrao })
      ]);

      if (!resClientes.ok) {
        if (resClientes.status === 401 || resClientes.status === 403) {
            backEndDisponivel.current = false;
            throw new Error("Acesso Negado. Verifique permissões.");
        }
        throw new Error("Falha ao buscar dados de clientes.");
      }
      
      const rawClientes = await resClientes.json();
      const rawVendas = resVendas.ok ? await resVendas.json() : [];
      
      const listaClientes = Array.isArray(rawClientes) ? rawClientes : (rawClientes.content || []);
      const listaVendas = Array.isArray(rawVendas) ? rawVendas : (rawVendas.content || []);

      let tabelaProcessada = [];
      let resumo = { totalClientes: 0, kpiSecundario: 0, kpiTerceiro: 0 };

      if (filtros.subRelatorio === 'top_clientes') {
          const mapClientes = {};
          
          listaClientes.forEach(c => {
             const id = c.idCliente;
             if (id) mapClientes[id] = { id, nome: c.nomeCompleto || 'S/N', contato: c.telefone || c.email || 'N/I', compras: 0, total: 0 };
          });

          listaVendas.forEach(v => {
             const cId = v.idCliente || v.cliente?.id;
             if (cId && mapClientes[cId]) {
                 mapClientes[cId].compras += 1;
                 mapClientes[cId].total += Number(v.valorTotal || v.total || 0);
             }
          });

          tabelaProcessada = Object.values(mapClientes).filter(c => c.compras > 0).sort((a, b) => b.total - a.total);
        
          resumo.totalClientes = tabelaProcessada.length;
          resumo.kpiSecundario = tabelaProcessada.length > 0 ? tabelaProcessada.reduce((acc, c) => acc + c.total, 0) / tabelaProcessada.length : 0;
          resumo.kpiTerceiro = tabelaProcessada.length > 0 ? tabelaProcessada[0].total : 0;
      } 
      else if (filtros.subRelatorio === 'inativos') {
          const hojeTime = new Date().getTime();
          const ultimaCompraMap = {};
          
          listaVendas.forEach(v => {
              const cId = v.idCliente || v.cliente?.id;
              if (!cId) return;
              const dRaw = v.dataVenda || v.dataHora || v.dataCriacao;
              const dtVenda = new Date(dRaw).getTime();

              if (!ultimaCompraMap[cId] || dtVenda > ultimaCompraMap[cId].dtTime) {
                  ultimaCompraMap[cId] = { dtTime: dtVenda, dtStr: dRaw, valor: Number(v.valorTotal || v.total || 0) };
              }
          });

          listaClientes.forEach(c => {
             if (c.ativo === false) return; 

             const id = c.idCliente;
             const ultima = ultimaCompraMap[id];
             const diasInativo = ultima ? Math.floor((hojeTime - ultima.dtTime) / (1000 * 3600 * 24)) : 999;

             if (diasInativo > 45) {
                 tabelaProcessada.push({
                     id,
                     nome: c.nomeCompleto || 'S/N',
                     contato: c.telefone || c.email || 'N/I',
                     ultimaCompra: ultima ? new Date(ultima.dtStr).toLocaleDateString('pt-BR') : null,
                     diasInativo: diasInativo > 999 ? 999 : diasInativo,
                     faturamentoPerdido: ultima ? ultima.valor : 0 
                 });
             }
          });

          tabelaProcessada.sort((a, b) => b.diasInativo - a.diasInativo);
          resumo.totalClientes = tabelaProcessada.length;
          resumo.kpiSecundario = tabelaProcessada.reduce((acc, c) => acc + c.faturamentoPerdido, 0); 
          resumo.kpiTerceiro = 45;
      }
      else if (filtros.subRelatorio === 'aniversariantes') {
          const dataRef = new Date();
          const diaHoje = dataRef.getDate();
          const mesHoje = dataRef.getMonth() + 1;

          const dataAmanha = new Date();
          dataAmanha.setDate(dataRef.getDate() + 1);
          const diaAmanha = dataAmanha.getDate();
          const mesAmanha = dataAmanha.getMonth() + 1;
          
          listaClientes.forEach(c => {
             if (!c.dataNascimento) return;
             
             const { dia: diaNasc, mes: mesNasc, ano: anoNasc } = obterDiaMes(c.dataNascimento);
             if (mesNasc === 0) return;

             let isMatch = false;
             
             if (filtros.periodoAcesso === 'HOJE') {
                 isMatch = (mesNasc === mesHoje && diaNasc === diaHoje);
             } else if (filtros.periodoAcesso === 'AMANHA') {
                 isMatch = (mesNasc === mesAmanha && diaNasc === diaAmanha);
             } else {
                 const mesAlvo = parseInt((filtros.dataInicio || '').split('-')[1] || "0", 10);
                 isMatch = (mesNasc === mesAlvo);
             }

             if (isMatch) {
                 const idade = new Date().getFullYear() - anoNasc;
                 tabelaProcessada.push({
                     id: c.idCliente,
                     nome: c.nomeCompleto || 'S/N',
                     nascimento: parseDataNascimentoBackend(c.dataNascimento),
                     idade: (idade > 0 && idade < 120) ? idade : 'N/I',
                     contato: c.telefone || 'N/I',
                     email: c.email || 'N/I'
                 });
             }
          });

          tabelaProcessada.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
          resumo.totalClientes = tabelaProcessada.length;
          resumo.kpiSecundario = filtros.periodoAcesso === 'ESTE_MES' ? parseInt((filtros.dataInicio || '').split('-')[1] || "0", 10) : mesHoje; 
          resumo.kpiTerceiro = tabelaProcessada.length; 
      }

      setDados({ tabela: tabelaProcessada, resumo });
      setReq({ loading: false, erro: null });

    } catch (error) {
      setDados({ tabela: [], resumo: { totalClientes: 0, kpiSecundario: 0, kpiTerceiro: 0 }});
      setReq({ loading: false, erro: error.message });
    }
  }, [filtros.dataInicio, filtros.dataFim, filtros.subRelatorio, filtros.periodoAcesso, headersPadrao]);

  useEffect(() => { 
    if(usuario.token) fetchData(); 
  }, [fetchData, usuario.token]);

  const exportarCSV = () => {
    setShowExportMenu(false);
    let csv = "\uFEFF"; 
    const { subRelatorio } = filtros;

    if (subRelatorio === 'top_clientes') {
      csv += "Rank;Cliente;Contato;Nº Compras;Ticket Médio;Total\n";
      dados.tabela.forEach((v, i) => csv += `"${i+1}º";"${v.nome}";"${v.contato}";"${v.compras}";"${formatarMoeda(v.total/v.compras)}";"${formatarMoeda(v.total)}"\n`);
    } else if (subRelatorio === 'inativos') {
      csv += "Cliente;Contato;Última Compra;Dias Inativo;Média Perdida\n";
      dados.tabela.forEach(v => csv += `"${v.nome}";"${v.contato}";"${v.ultimaCompra || 'Nunca Comprou'}";"${v.diasInativo}";"${formatarMoeda(v.faturamentoPerdido)}"\n`);
    } else {
      csv += "Cliente;Nascimento;Idade;Telefone;E-mail\n";
      dados.tabela.forEach(v => csv += `"${v.nome}";"${v.nascimento}";"${v.idade}";"${v.contato}";"${v.email}"\n`);
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_Clientes_${new Date().getTime()}.csv`;
    link.click();
  };

  const exportarPDF = () => {
    setShowExportMenu(false);

    const { subRelatorio } = filtros;
    const subAtiva = MODULO_CLIENTES.find(s => s.id === subRelatorio);
    const tituloRelatorio = `RELATÓRIO DE CRM - ${subAtiva?.nome.toUpperCase()}`;
    const labelPeriodo = subRelatorio === 'aniversariantes' 
      ? `Filtro Aplicado: ${filtros.periodoAcesso}` 
      : `Período: ${(filtros.dataInicio || '').split('-').reverse().join('/')} a ${(filtros.dataFim || '').split('-').reverse().join('/')}`;

    let titulosTabela = [];
    if (subRelatorio === 'top_clientes') titulosTabela = ['Rank', 'Cliente', 'Compras', 'Ticket Médio', 'Total Gasto'];
    else if (subRelatorio === 'inativos') titulosTabela = ['Cliente', 'Contato', 'Última Compra', 'Dias Inativo', 'Risco Financeiro'];
    else titulosTabela = ['Cliente', 'Nascimento', 'Idade', 'Contato', 'E-mail'];

    const linhasTabela = dados.tabela.length > 0 ? dados.tabela.map((v, i) => {
      if (subRelatorio === 'top_clientes') {
        return `<tr><td style="text-align: center;">${i+1}º</td><td>${v.nome}</td><td style="text-align: center;">${v.compras}</td><td class="right">${formatarMoeda(v.total/v.compras)}</td><td class="right" style="font-weight: bold;">${formatarMoeda(v.total)}</td></tr>`;
      } else if (subRelatorio === 'inativos') {
        return `<tr><td>${v.nome}</td><td>${v.contato}</td><td>${v.ultimaCompra || 'S/ Registro'}</td><td style="text-align: center;">${v.diasInativo} d</td><td class="right" style="font-weight: bold;">${formatarMoeda(v.faturamentoPerdido)}</td></tr>`;
      } else {
        return `<tr><td>${v.nome}</td><td>${v.nascimento}</td><td style="text-align: center;">${v.idade}</td><td>${v.contato}</td><td>${v.email}</td></tr>`;
      }
    }).join("") : `<tr><td colspan="${titulosTabela.length}" style="text-align: center; padding: 20px;">Nenhum cliente encontrado.</td></tr>`;

    const kpi1 = subRelatorio === 'top_clientes' ? "Ticket Médio (Curva A)" : subRelatorio === 'inativos' ? "Faturamento em Risco" : "Mês Base";
    const kpi2 = subRelatorio === 'aniversariantes' ? String(dados.resumo.kpiSecundario || '0').padStart(2, '0') : formatarMoeda(dados.resumo.kpiSecundario);
    const kpi3Label = subRelatorio === 'top_clientes' ? "Maior Faturamento" : subRelatorio === 'inativos' ? "SLA Inatividade" : "Promoções a Enviar";
    const kpi3Value = subRelatorio === 'top_clientes' ? formatarMoeda(dados.resumo.kpiTerceiro) : subRelatorio === 'inativos' ? `+${dados.resumo.kpiTerceiro} Dias` : dados.resumo.kpiTerceiro;

    const resumoHtml = `
      <div style="display: flex; gap: 20px; font-size: 10px; color: #111827; border: 1px solid #E5E7EB; padding: 15px; border-radius: 12px; margin-bottom: 20px;">
        <div style="flex: 1;">
          <div style="font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #6B7280;">Base Filtrada</div>
          <div style="font-size: 14pt; font-weight: 900;">${dados.resumo.totalClientes}</div>
        </div>
        <div style="flex: 1; border-left: 1px solid #E5E7EB; padding-left: 15px;">
          <div style="font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #6B7280;">${kpi1}</div>
          <div style="font-size: 14pt; font-weight: 900;">${kpi2}</div>
        </div>
        <div style="flex: 1; border-left: 1px solid #E5E7EB; padding-left: 15px;">
          <div style="font-size: 8pt; font-weight: 700; text-transform: uppercase; color: #6B7280;">${kpi3Label}</div>
          <div style="font-size: 14pt; font-weight: 900;">${kpi3Value}</div>
        </div>
      </div>
    `;

    try {
        gerarTemplateRelatorio({
          tituloRelatorio, 
          periodo: labelPeriodo, 
          resumoHtml, 
          titulosTabela, 
          linhasTabela, 
          usuario, 
          dadosNegocio: unidade, 
          logoUrl: window.location.origin + logoImage
        });
    } catch (e) {
        alert("Ocorreu um erro ao gerar o documento PDF.");
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl shadow-sm z-50">
          <p className="font-black text-xs uppercase tracking-widest mb-1 text-[var(--text-main)]">{label || payload[0].name}</p>
          <p className="font-bold text-sm tabular-nums text-black dark:text-white">
            {filtros.subRelatorio === 'top_clientes' ? formatarMoeda(payload[0].value) : `${payload[0].value} Clientes`}
          </p>
        </div>
      );
    }
    return null;
  };

  const chartData = useMemo(() => {
    if (filtros.subRelatorio === 'top_clientes') {
      return dados.tabela.slice(0, 10).map(c => ({ name: (c.nome || '').split(' ')[0], value: c.total }));
    }
    if (filtros.subRelatorio === 'inativos') {
       let q45 = 0, q90 = 0, q180 = 0;
       dados.tabela.forEach(c => {
         if (c.diasInativo <= 90) q45++;
         else if (c.diasInativo <= 180) q90++;
         else q180++;
       });
       return [
         { name: '45 a 90 Dias', value: q45 }, { name: '3 a 6 Meses', value: q90 }, { name: '+6 Meses', value: q180 }
       ].filter(d => d.value > 0);
    }
    return [];
  }, [dados.tabela, filtros.subRelatorio]);

  const listaPeriodos = filtros.subRelatorio === 'aniversariantes' ? OPCOES_PERIODO_ANIVERSARIO : OPCOES_PERIODO_GERAL;

  return (
    <div className="w-full h-full font-sans flex flex-col transition-colors duration-300 bg-transparent gap-4 md:gap-6 p-4 animate-in fade-in duration-500 overflow-x-hidden">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4 shrink-0">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={() => navigate(-1)} className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors active:scale-95 bg-transparent">
            <ArrowLeft className="w-6 h-6" style={{ color: 'var(--bg-sidebar)' }} />
          </button>
          
          <div className="flex flex-col justify-center">
            <h1 className="text-xl md:text-[26px] font-black italic uppercase tracking-tighter leading-none" style={{ color: 'var(--bg-sidebar)' }}>
              Relatórios CRM
            </h1>
            <p className="text-xs md:text-sm font-medium tracking-wide opacity-60 mt-1 text-[var(--text-main)]">
              Análise estratégica e retenção de base.
            </p>
          </div>
        </div>

        <div className="relative w-full md:w-auto modal-container-export">
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={req.loading || dados.tabela.length === 0}
            className="w-full md:w-auto px-6 py-3 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--bg-sidebar)' }}
          >
            Exportar <ChevronDown size={14} className={`transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
          </button>
          
          {showExportMenu && (
            <div className="absolute top-[110%] right-0 w-full md:w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
              <button onClick={exportarPDF} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 border-b border-[var(--border-color)] transition-colors text-[var(--text-main)]">
                <FileText size={16} style={{ color: 'var(--bg-sidebar)' }} /> Imprimir PDF
              </button>
              <button onClick={exportarCSV} className="w-full flex items-center gap-3 px-5 py-4 text-xs font-black uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[var(--text-main)]">
                <TableIcon size={16} style={{ color: '#10B981' }} /> Baixar Excel
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[20px] p-4 flex flex-col xl:flex-row justify-between items-stretch xl:items-center gap-4 shrink-0 shadow-sm w-full">
        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
            <div className="relative w-full md:w-56 modal-container-periodo">
                <button 
                  onClick={() => setShowPeriodoModal(!showPeriodoModal)}
                  className="flex justify-between items-center w-full px-4 py-3 border border-[var(--border-color)] rounded-xl bg-transparent transition-colors hover:border-[var(--bg-sidebar)] outline-none"
                >
                  <div className="flex items-center gap-2">
                      <CalendarDays size={16} style={{ color: 'var(--bg-sidebar)' }} />
                      <span className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] truncate">
                        {listaPeriodos.find(o => o.id === filtros.periodoAcesso)?.label || 'Selecionar'}
                      </span>
                  </div>
                  <ChevronDown size={14} className={`opacity-40 transition-transform ${showPeriodoModal ? "rotate-180" : ""}`} />
                </button>

                {showPeriodoModal && (
                  <div className="absolute top-[110%] left-0 w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                      {listaPeriodos.map(op => (
                      <button
                          key={op.id}
                          onClick={() => { aplicarPeriodoRapido(op.id); setShowPeriodoModal(false); }}
                          className={`w-full text-left px-4 py-3 text-[10px] md:text-xs font-black uppercase tracking-widest transition-colors ${filtros.periodoAcesso === op.id ? 'bg-[var(--bg-sidebar)]/10 text-[var(--bg-sidebar)]' : 'text-[var(--text-main)] opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5'}`}
                      >
                          {op.label}
                      </button>
                      ))}
                  </div>
                )}
            </div>

            {(filtros.periodoAcesso === 'CUSTOM' || (filtros.subRelatorio === 'aniversariantes' && filtros.periodoAcesso === 'ESTE_MES')) && (
                <div className="flex items-center gap-2 px-4 py-2 border border-[var(--border-color)] rounded-xl bg-transparent w-full md:w-auto animate-in fade-in">
                    <div className="flex flex-col flex-1">
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]">
                          {filtros.subRelatorio === 'aniversariantes' ? 'Mês Alvo' : 'Início'}
                        </span>
                        <input 
                          type={filtros.subRelatorio === 'aniversariantes' ? "month" : "date"} 
                          value={filtros.subRelatorio === 'aniversariantes' ? (filtros.dataInicio || '').slice(0,7) : filtros.dataInicio} 
                          onChange={(e) => alterarFiltro('dataInicio', filtros.subRelatorio === 'aniversariantes' ? e.target.value + '-01' : e.target.value)} 
                          className="bg-transparent w-full text-[10px] md:text-xs font-black outline-none cursor-pointer text-[var(--text-main)] [color-scheme:light] dark:[color-scheme:dark] uppercase" 
                        />
                    </div>
                    {filtros.subRelatorio !== 'aniversariantes' && (
                      <>
                        <span className="text-[10px] font-black uppercase opacity-30 text-[var(--text-main)]">ATÉ</span>
                        <div className="flex flex-col flex-1 border-l border-[var(--border-color)] pl-3">
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]">Fim</span>
                            <input type="date" value={filtros.dataFim} onChange={(e) => alterarFiltro('dataFim', e.target.value)} className="bg-transparent w-full text-[10px] md:text-xs font-black outline-none cursor-pointer text-[var(--text-main)] [color-scheme:light] dark:[color-scheme:dark]" />
                        </div>
                      </>
                    )}
                </div>
            )}
        </div>

        <nav className="flex gap-2 overflow-x-auto scrollbar-hide snap-x w-full xl:w-auto pb-1 xl:pb-0">
          {MODULO_CLIENTES.map(s => (
            <button 
              key={s.id} onClick={() => alterarFiltro('subRelatorio', s.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] md:text-xs font-black uppercase tracking-wider border transition-all whitespace-nowrap shrink-0 snap-start"
              style={{
                backgroundColor: filtros.subRelatorio === s.id ? 'var(--bg-sidebar)' : 'transparent',
                borderColor: filtros.subRelatorio === s.id ? 'var(--bg-sidebar)' : 'var(--border-color)',
                color: filtros.subRelatorio === s.id ? '#FFF' : 'var(--text-main)',
                opacity: filtros.subRelatorio === s.id ? 1 : 0.6
              }}
            >
              <s.icone size={14} /> {s.nome}
            </button>
          ))}
        </nav>

        {filtros.subRelatorio !== 'aniversariantes' && (
            <div className="flex bg-transparent p-1 rounded-xl border border-[var(--border-color)] w-full xl:w-auto justify-center shrink-0">
                <button onClick={() => alterarFiltro('modoVisao', 'tabela')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg flex justify-center items-center gap-2 transition-all ${filtros.modoVisao === 'tabela' ? 'bg-[var(--bg-sidebar)] text-white shadow-sm' : 'opacity-40 text-[var(--text-main)]'}`}>
                    <ListIcon size={14} /> <span className="text-[10px] md:text-xs font-black uppercase">Lista</span>
                </button>
                <button onClick={() => alterarFiltro('modoVisao', 'grafico')} className={`flex-1 sm:flex-none px-4 py-2 rounded-lg flex justify-center items-center gap-2 transition-all ${filtros.modoVisao === 'grafico' ? 'bg-[var(--bg-sidebar)] text-white shadow-sm' : 'opacity-40 text-[var(--text-main)]'}`}>
                    <PieChartIcon size={14} /> <span className="text-[10px] md:text-xs font-black uppercase">Gráfico</span>
                </button>
            </div>
        )}
      </section>

      {!req.loading && !req.erro && (
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 w-full">
            <div className="py-5 md:py-6 px-4 border text-center shadow-sm flex flex-col justify-center gap-1.5 rounded-[20px] bg-[var(--bg-card)] border-[var(--border-color)]">
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-60 mb-1 text-[var(--text-main)]">Base Filtrada</span>
                <span className="text-xl md:text-2xl font-black tabular-nums text-black dark:text-white">{dados.resumo.totalClientes}</span>
            </div>
            
            <div className="py-5 md:py-6 px-4 border text-center shadow-sm flex flex-col justify-center gap-1.5 rounded-[20px] bg-[var(--bg-card)] border-[var(--border-color)]">
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-60 mb-1 text-[var(--text-main)]">
                  {filtros.subRelatorio === 'top_clientes' ? 'Ticket Médio (Curva A)' : filtros.subRelatorio === 'inativos' ? 'Faturamento em Risco' : 'Mês Base'}
                </span>
                <span className={`text-xl md:text-2xl font-black tabular-nums text-black dark:text-white`}>
                  {filtros.subRelatorio === 'aniversariantes' ? String(dados.resumo.kpiSecundario || '0').padStart(2, '0') : formatarMoeda(dados.resumo.kpiSecundario)}
                </span>
            </div>

            <div className="py-5 md:py-6 px-4 border text-center shadow-sm flex flex-col justify-center gap-1.5 rounded-[20px] bg-[var(--bg-card)] border-[var(--border-color)]">
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest opacity-60 mb-1 text-[var(--text-main)]">
                  {filtros.subRelatorio === 'top_clientes' ? 'Maior Faturamento' : filtros.subRelatorio === 'inativos' ? 'SLA Inatividade' : 'Promoções a Enviar'}
                </span>
                <span className="text-xl md:text-2xl font-black tabular-nums text-black dark:text-white">
                  {filtros.subRelatorio === 'top_clientes' ? formatarMoeda(dados.resumo.kpiTerceiro) : filtros.subRelatorio === 'inativos' ? `+${dados.resumo.kpiTerceiro} Dias` : dados.resumo.kpiTerceiro}
                </span>
            </div>
        </section>
      )}

      <main className="flex-1 w-full bg-transparent md:bg-[var(--bg-card)] md:border md:border-[var(--border-color)] rounded-[20px] overflow-hidden relative flex flex-col md:shadow-sm min-h-[400px]">
            {req.loading ? (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-card)]/60 backdrop-blur-sm">
                    <RefreshCw className="animate-spin mb-4" size={36} style={{ color: 'var(--bg-sidebar)' }} /> 
                    <span className="text-xs font-black uppercase tracking-widest opacity-50 text-[var(--text-main)]">Sincronizando...</span>
                </div>
            ) : req.erro ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-center p-8">
                    <AlertCircle size={48} className="mb-4 opacity-30" style={{ color: 'var(--bg-sidebar)' }} />
                    <p className="font-black text-sm uppercase tracking-widest mb-5" style={{ color: 'var(--bg-sidebar)' }}>{req.erro}</p>
                    <button onClick={() => { backEndDisponivel.current = true; fetchData(); }} className="font-black text-xs uppercase tracking-widest text-white px-6 py-3 rounded-xl transition-opacity hover:opacity-80" style={{ backgroundColor: 'var(--bg-sidebar)' }}>
                        Tentar Novamente
                    </button>
                </div>
            ) : dados.tabela.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center opacity-30 p-12 text-center">
                    <Box size={56} className="mb-4 text-[var(--text-main)]" />
                    <p className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">Base Vazia</p>
                    <p className="text-xs font-bold mt-2 text-[var(--text-main)]">
                        {filtros.subRelatorio === 'aniversariantes' 
                            ? 'Não há aniversariantes no período selecionado.' 
                            : 'Nenhum dado encontrado para este filtro.'}
                    </p>
                </div>
            ) : filtros.modoVisao === 'grafico' && filtros.subRelatorio !== 'aniversariantes' ? (
                <div className="flex-1 p-4 md:p-8 flex flex-col items-center justify-center w-full min-h-[400px] bg-[var(--bg-card)] rounded-[20px] border border-[var(--border-color)] md:border-none animate-in fade-in">
                    <div className="w-full h-full min-h-[350px] max-w-4xl">
                        <ResponsiveContainer width="100%" height="100%">
                            {filtros.subRelatorio === 'inativos' ? (
                                <PieChart>
                                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={100} outerRadius={150} paddingAngle={2} dataKey="value" stroke="none">
                                        {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={CORES_PIE[index % CORES_PIE.length]} />)}
                                    </Pie>
                                    <Tooltip cursor={false} content={<CustomTooltip />} />
                                </PieChart>
                            ) : (
                                <BarChart data={chartData} margin={{ bottom: 40 }}>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-main)', opacity: 0.6, fontSize: 12, fontWeight: 700 }} dy={15} />
                                    <YAxis hide /> 
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
                                    <Bar dataKey="value" fill="var(--bg-sidebar)" radius={[6, 6, 0, 0]} barSize={50} />
                                </BarChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="hidden md:block flex-1 w-full overflow-x-auto overflow-y-auto custom-slim-scroll">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead className="sticky top-0 z-20 border-b border-[var(--border-color)] bg-[var(--bg-card)] backdrop-blur-sm">
                            <tr className="text-[11px] font-black text-[var(--text-main)] uppercase tracking-widest opacity-60">
                                {filtros.subRelatorio === 'top_clientes' && (
                                    <><th className="px-6 py-5 w-16 text-center">Rank</th><th className="px-6 py-5">Cliente</th><th className="px-6 py-5">Contato</th><th className="px-6 py-5 text-center">Nº Compras</th><th className="px-6 py-5 text-right">Ticket Médio</th><th className="px-6 py-5 text-right">Total Gerado</th></>
                                )}
                                {filtros.subRelatorio === 'inativos' && (
                                    <><th className="px-6 py-5">Cliente</th><th className="px-6 py-5">Contato</th><th className="px-6 py-5">Última Compra</th><th className="px-6 py-5 text-center">Dias Frio</th><th className="px-6 py-5 text-right">Risco / Perda</th></>
                                )}
                                {filtros.subRelatorio === 'aniversariantes' && (
                                    <><th className="px-6 py-5">Cliente</th><th className="px-6 py-5">Nascimento</th><th className="px-6 py-5 text-center">Idade</th><th className="px-6 py-5">Contato</th><th className="px-6 py-5">E-mail</th></>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {dados.tabela.map((c, i) => (
                                <tr key={c.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm font-bold text-[var(--text-main)] whitespace-nowrap">
                                    {filtros.subRelatorio === 'top_clientes' && (
                                        <><td className="px-6 py-4 text-center opacity-40">{i + 1}º</td><td className="px-6 py-4">{c.nome}</td><td className="px-6 py-4 opacity-60 font-medium">{c.contato}</td><td className="px-6 py-4 text-center tabular-nums text-black dark:text-white">{c.compras}</td><td className="px-6 py-4 text-right tabular-nums text-black dark:text-white">{formatarMoeda(c.total / c.compras)}</td><td className="px-6 py-4 text-right tabular-nums text-black dark:text-white">{formatarMoeda(c.total)}</td></>
                                    )}
                                    {filtros.subRelatorio === 'inativos' && (
                                        <><td className="px-6 py-4">{c.nome}</td><td className="px-6 py-4 opacity-60 font-medium">{c.contato}</td><td className="px-6 py-4 tabular-nums font-medium text-black dark:text-white">{c.ultimaCompra || 'S/ Registro'}</td><td className="px-6 py-4 text-center tabular-nums text-black dark:text-white">{c.diasInativo >= 999 ? '+999' : c.diasInativo} d</td><td className="px-6 py-4 text-right tabular-nums text-black dark:text-white">{formatarMoeda(c.faturamentoPerdido)}</td></>
                                    )}
                                    {filtros.subRelatorio === 'aniversariantes' && (
                                        <><td className="px-6 py-4">{c.nome}</td><td className="px-6 py-4 tabular-nums font-medium text-black dark:text-white">{c.nascimento}</td><td className="px-6 py-4 text-center tabular-nums text-black dark:text-white">{c.idade}</td><td className="px-6 py-4 tabular-nums font-medium text-black dark:text-white">{c.contato}</td><td className="px-6 py-4 opacity-60 font-medium">{c.email}</td></>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {filtros.modoVisao === 'tabela' && !req.loading && dados.tabela.length > 0 && (
              <div className="flex md:hidden flex-col gap-3 w-full pb-6 mt-2">
                {dados.tabela.map((item, idx) => (
                  <div key={idx} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                    {filtros.subRelatorio === 'top_clientes' && (
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col overflow-hidden max-w-[65%]">
                          <span className="text-sm font-bold text-[var(--text-main)] truncate">{idx + 1}º {item.nome}</span>
                          <span className="text-[10px] font-black opacity-40 text-[var(--text-main)] uppercase tracking-widest mt-0.5">
                            Qtd: {item.compras} | TM: {formatarMoeda(item.total / item.compras)}
                          </span>
                        </div>
                        <span className="text-sm font-black tabular-nums shrink-0 text-black dark:text-white">{formatarMoeda(item.total)}</span>
                      </div>
                    )}
                    {filtros.subRelatorio === 'inativos' && (
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col overflow-hidden max-w-[65%]">
                          <span className="text-sm font-bold text-[var(--text-main)] truncate">{item.nome}</span>
                          <span className="text-[10px] font-black uppercase tracking-widest mt-0.5 opacity-50 text-[var(--text-main)]">Última: {item.ultimaCompra || 'S/N'} ({item.diasInativo}d)</span>
                        </div>
                        <span className="text-sm font-black tabular-nums shrink-0 text-black dark:text-white">{formatarMoeda(item.faturamentoPerdido)}</span>
                      </div>
                    )}
                    {filtros.subRelatorio === 'aniversariantes' && (
                      <div className="flex justify-between items-center">
                        <div className="flex flex-col overflow-hidden max-w-[65%]">
                          <span className="text-sm font-bold text-[var(--text-main)] truncate">{item.nome}</span>
                          <span className="text-[10px] font-black opacity-40 text-[var(--text-main)] uppercase tracking-widest mt-0.5">{item.contato}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black tabular-nums shrink-0 text-black dark:text-white">{item.nascimento}</span>
                          <span className="text-[10px] font-black opacity-40 text-[var(--text-main)] uppercase tracking-widest mt-0.5">{item.idade} anos</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
      </main>
    </div>
  );
}