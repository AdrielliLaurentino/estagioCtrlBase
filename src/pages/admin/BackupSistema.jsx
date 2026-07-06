import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, HardDrive, Database, Clock, 
  History, Download, RefreshCw, AlertCircle, 
  CheckCircle, Save, ShieldAlert
} from "lucide-react";

export default function BackupSistema() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [gerandoBackup, setGerandoBackup] = useState(false);
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" });
  const [backupAutomatico, setBackupAutomatico] = useState(true);
  const [horarioBackup, setHorarioBackup] = useState("03:00");
  const [historico, setHistorico] = useState([
    { id: "bkp_10042026", data: "10/04/2026 03:00", tamanho: "45.2 MB", tipo: "Automático" },
    { id: "bkp_09042026", data: "09/04/2026 03:00", tamanho: "44.8 MB", tipo: "Automático" },
    { id: "bkp_08042026_man", data: "08/04/2026 15:42", tamanho: "44.5 MB", tipo: "Manual" },
  ]);

  const handleSalvarConfiguracao = (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ tipo: "", texto: "" });
    
    setTimeout(() => {
      setMensagem({ tipo: "sucesso", texto: "Rotina de backup automático atualizada!" });
      setLoading(false);
      window.scrollTo(0,0);
    }, 1000);
  };

  const handleGerarBackupManual = () => {
    setGerandoBackup(true);
    setMensagem({ tipo: "", texto: "" });
    setTimeout(() => {
      const novoBackup = {
        id: `bkp_manual_${Date.now()}`,
        data: new Date().toLocaleString('pt-BR').slice(0, 16),
        tamanho: "45.3 MB",
        tipo: "Manual"
      };
      
      setHistorico([novoBackup, ...historico]);
      setMensagem({ tipo: "sucesso", texto: "Backup manual gerado com sucesso!" });
      setGerandoBackup(false);
      window.scrollTo(0,0);
    }, 2500);
  };

  return (
    <div className="w-full h-full p-6 md:p-10 transition-colors duration-300 rounded-3xl bg-transparent">
      
      {/* HEADER */}
      <header className="flex items-center justify-between mb-8 w-full">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate(-1)} className="transition-colors text-[var(--text-main)] opacity-50 hover:opacity-100 hover:text-[#DC2626]">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-serif font-bold text-[#DC2626] uppercase tracking-wide">
              BACKUP DO SISTEMA
            </h1>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest ml-9 text-[var(--text-main)] opacity-50">
            Proteção, exportação e restauração de dados
          </p>
        </div>
      </header>

      {/* FEEDBACK DE MENSAGENS */}
      {mensagem.texto && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${mensagem.tipo === 'erro' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-green-500/10 border-green-500/30 text-green-500'} animate-in fade-in`}>
          {mensagem.tipo === 'erro' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span className="text-sm font-semibold">{mensagem.texto}</span>
        </div>
      )}

      <div className="flex flex-col gap-8 pb-20 w-full">
        
        {/*STATUS E BACKUP MANUAL*/}
        <section className="rounded-3xl p-6 md:p-8 w-full transition-colors duration-300 bg-[var(--bg-card)] border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-6 border-b pb-4 border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <Database className="text-[#DC2626]" size={24} />
              <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--text-main)]">Banco de Dados</h2>
            </div>
            <span className="text-[10px] font-bold px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full uppercase tracking-widest flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Nuvem Conectada
            </span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-5 rounded-2xl bg-[var(--bg-body)] border border-[var(--border-color)]">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                <HardDrive size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-[var(--text-main)]">Saúde dos Dados Operacional</span>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-main)] opacity-50 mt-1">
                  Último backup salvo em: {historico[0]?.data || "Nenhum registro"}
                </span>
              </div>
            </div>

            <button 
              onClick={handleGerarBackupManual}
              disabled={gerandoBackup}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[#DC2626] text-[var(--text-main)] rounded-xl text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={gerandoBackup ? "animate-spin" : ""} /> 
              {gerandoBackup ? "Compactando..." : "Gerar Backup Agora"}
            </button>
          </div>
        </section>

        {/*ROTINA AUTOMÁTICA*/}
        <section className="rounded-3xl p-6 md:p-8 w-full transition-colors duration-300 bg-[var(--bg-card)] border border-[var(--border-color)]">
          <div className="flex items-center gap-3 mb-6 border-b pb-4 border-[var(--border-color)]">
            <Clock className="text-[#DC2626]" size={24} />
            <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--text-main)]">Rotina Automática</h2>
          </div>
          
          <form onSubmit={handleSalvarConfiguracao} className="flex flex-col gap-6">
            
            {/* Toggle de Ativação */}
            <div className="flex items-center justify-between p-5 rounded-2xl bg-[var(--bg-body)] border border-[var(--border-color)]">
              <div className="flex flex-col pr-4">
                <span className="text-sm font-bold text-[var(--text-main)]">Backup Diário Automático</span>
                <span className="text-xs text-[var(--text-main)] opacity-60 mt-1">O sistema fará uma cópia de segurança todos os dias no horário programado.</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={backupAutomatico} 
                  onChange={(e) => setBackupAutomatico(e.target.checked)} 
                />
                <div className="w-11 h-6 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#DC2626]"></div>
              </label>
            </div>

            {/* Configuração de Horário */}
            <div className={`transition-all duration-300 ${backupAutomatico ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
              <div className="flex flex-col gap-1 w-full max-w-xs">
                <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-[var(--text-main)] opacity-60">Horário de Execução</label>
                <input
                  type="time" 
                  value={horarioBackup}
                  onChange={(e) => setHorarioBackup(e.target.value)}
                  className="w-full border rounded-xl px-4 py-3 outline-none transition-colors bg-[var(--bg-body)] text-[var(--text-main)] border-[var(--border-color)] focus:border-[#DC2626]"
                />
                <span className="text-[10px] text-[var(--text-main)] opacity-50 ml-1 mt-1">
                  Recomendamos horários de baixo movimento (ex: madrugada).
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit" 
                disabled={loading} 
                className="flex items-center gap-2 px-8 py-3 bg-[#DC2626] hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)]"
              >
                <Save size={18} /> {loading ? "Salvando..." : "Salvar Rotina"}
              </button>
            </div>
          </form>
        </section>

        {/*HISTÓRICO DE BACKUPS*/}
        <section className="rounded-3xl p-6 md:p-8 w-full transition-colors duration-300 bg-[var(--bg-card)] border border-[var(--border-color)]">
          <div className="flex items-center justify-between mb-6 border-b pb-4 border-[var(--border-color)]">
            <div className="flex items-center gap-3">
              <History className="text-[#DC2626]" size={24} />
              <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--text-main)]">Histórico Recente</h2>
            </div>
            <span className="text-[10px] font-bold px-3 py-1 bg-[var(--bg-body)] border border-[var(--border-color)] text-[var(--text-main)] opacity-70 rounded-full uppercase tracking-widest">
              Últimos 7 dias
            </span>
          </div>
          
          <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-[10px] uppercase text-[var(--text-main)] opacity-50 bg-[var(--bg-body)] border-b border-[var(--border-color)]">
                <tr>
                  <th className="p-4 font-bold">Data e Hora</th>
                  <th className="p-4 font-bold">Tamanho</th>
                  <th className="p-4 font-bold">Origem</th>
                  <th className="p-4 font-bold text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {historico.map((bkp, idx) => (
                  <tr key={bkp.id} className={`border-b border-[var(--border-color)] transition-colors hover:bg-[var(--bg-body)] ${idx === historico.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="p-4 font-bold text-[var(--text-main)] flex items-center gap-2">
                      <Database size={14} className="opacity-50" /> {bkp.data}
                    </td>
                    <td className="p-4 text-[var(--text-main)] opacity-80">{bkp.tamanho}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-md uppercase tracking-wider ${bkp.tipo === 'Automático' ? 'bg-purple-500/10 text-purple-500' : 'bg-orange-500/10 text-orange-500'}`}>
                        {bkp.tipo}
                      </span>
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      <button type="button" className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-body)] border border-[var(--border-color)] text-[var(--text-main)] opacity-70 hover:opacity-100 hover:text-[#DC2626] transition-all text-[11px] font-bold uppercase tracking-widest" title="Baixar Arquivo ZIP">
                        <Download size={14} /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex gap-3 items-start">
             <ShieldAlert size={18} className="text-yellow-600 mt-0.5 shrink-0" />
             <p className="text-xs text-yellow-600 leading-relaxed">
               <strong>Atenção:</strong> A restauração de um backup sobrescreve todos os dados atuais do sistema. Para evitar perda de dados recentes, a restauração só pode ser feita entrando em contato com o nosso Suporte Técnico.
             </p>
          </div>
        </section>

      </div>
    </div>
  );
}