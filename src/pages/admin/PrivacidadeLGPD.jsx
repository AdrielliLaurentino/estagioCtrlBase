import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FileText, ShieldCheck, Download, ArrowLeft, 
  CreditCard, CheckCircle, AlertCircle, Users, 
  Bell, Save, Lock, ShoppingCart
} from "lucide-react";

const ConsentToggle = ({ icone: Icon, titulo, descricao, checked, onChange, labelStatus }) => (
  <div className="flex items-start gap-4 p-5 rounded-2xl bg-[var(--bg-body)] border border-[var(--border-color)] transition-colors hover:border-[#DC2626]/50">
    <div className="p-3 rounded-full bg-[#DC2626]/10 text-[#DC2626] shrink-0">
      <Icon size={20} />
    </div>
    <div className="flex flex-col flex-1 pr-4">
      <span className="text-sm font-bold text-[var(--text-main)] leading-tight">{titulo}</span>
      <span className="text-xs text-[var(--text-main)] opacity-60 mt-1 leading-relaxed">{descricao}</span>
      <span className="text-[10px] font-bold uppercase tracking-widest mt-3 text-[var(--text-main)] opacity-40">
        Status atual: <span className={checked ? "text-green-500" : "text-red-500"}>{labelStatus}</span>
      </span>
    </div>
    <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
      <input type="checkbox" className="sr-only peer" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <div className="w-11 h-6 bg-[var(--border-color)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#DC2626]"></div>
    </label>
  </div>
);

export default function PrivacidadeLGPD() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [mensagem, setMensagem] = useState({ tipo: "", texto: "" });
  const [consenteSistema, setConsenteSistema] = useState(true);      
  const [consenteOfertas, setConsenteOfertas] = useState(true);      
  const [dadosAssinatura, setDadosAssinatura] = useState({
    modelo: "Faturamento Dinâmico (Por Aluno)",
    status: "Carregando...",
    alunosAtivos: 0,
    clientesCompraramMes: 0,
    valorPorAluno: 1.50,
    ipAceite: "Buscando...",
    dataAceite: "Buscando..."
  });

  const textoContrato = `CONTRATO DE LICENCIAMENTO DE SOFTWARE E TERMOS DE USO

1. DO OBJETO
O presente instrumento tem por objeto a concessão de licença de uso, em caráter não exclusivo e intransferível, do software de gestão GymCtrlBase.

2. DA FILOSOFIA E COMPROMISSO
Ao assinar este termo, a CONTRATANTE alinha-se à nossa premissa fundamental: otimizar processos, gerir múltiplos setores e fornecer métricas precisas de desempenho.

3. DOS PLANOS E FATURAMENTO (POR VOLUME)
3.1. O modelo de faturamento adotado é o Dinâmico (Pay-as-you-go), sendo o valor da licença calculado mensalmente com base na quantidade exata de ALUNOS ATIVOS registrados no banco de dados da CONTRATANTE no dia do fechamento da fatura.
3.2. O atraso no pagamento acarretará na suspensão temporária do acesso à plataforma após 5 (cinco) dias úteis de inadimplência.

4. DA PRIVACIDADE E PROTEÇÃO DE DADOS (LGPD)
O GymCtrlBase atua como Operador de Dados, fornecendo a infraestrutura em nuvem segura para o armazenamento. A responsabilidade pela coleta, base legal e gestão do consentimento dos alunos finais é exclusiva da CONTRATANTE (Controladora).`;

  useEffect(() => {
    const buscarDadosLGPD = async () => {
      try {
        setCarregandoDados(true);

        setTimeout(() => {
          setDadosAssinatura(prev => ({
            ...prev,
            status: "Ativo",
            alunosAtivos: 128,
            clientesCompraramMes: 45,
            ipAceite: "172.16.0.45",
            dataAceite: "12/05/2026 às 14:30" 
          }));
          setCarregandoDados(false);
        }, 800);

      } catch (error) {
        console.error("Erro ao buscar dados da assinatura:", error);
        setMensagem({ tipo: "erro", texto: "Falha ao carregar os dados da assinatura." });
        setCarregandoDados(false);
      }
    };

    buscarDadosLGPD();
  }, []);

  const estimativaFatura = (dadosAssinatura.alunosAtivos * dadosAssinatura.valorPorAluno).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const handleSalvarPreferencias = async (e) => {
    e.preventDefault();
    setLoading(true); 
    setMensagem({ tipo: "", texto: "" });
    
    try {
      setTimeout(() => {
        setMensagem({ tipo: "sucesso", texto: "Preferências de comunicação atualizadas com sucesso!" });
        setLoading(false); 
        window.scrollTo(0,0);
      }, 1000);
    } catch (error) {
      setMensagem({ tipo: "erro", texto: "Erro ao salvar preferências." });
      setLoading(false);
    }
  };

  const handleExcluirConta = () => {
    const confirmacao = window.confirm("ATENÇÃO: Esta ação é irreversível. Todos os dados da sua empresa e de seus clientes serão apagados do GymCtrlBase. Deseja solicitar a exclusão da conta?");
    if (confirmacao) {
      alert("Solicitação enviada. Entraremos em contato em até 48 horas úteis.");
    }
  };

  return (
    <div className="w-full h-full p-6 md:p-10 transition-colors duration-300 rounded-3xl bg-transparent">
      
      <header className="flex items-center justify-between mb-8 w-full">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => navigate(-1)} className="transition-colors text-[var(--text-main)] opacity-50 hover:opacity-100 hover:text-[#DC2626]">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-serif font-bold text-[#DC2626] uppercase tracking-wide">
              CONTRATO E PRIVACIDADE
            </h1>
          </div>
          <p className="text-xs font-bold uppercase tracking-widest ml-9 text-[var(--text-main)] opacity-50">
            Assinatura, Termos Legais e Consentimentos (LGPD)
          </p>
        </div>
      </header>

      {mensagem.texto && (
        <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${mensagem.tipo === 'erro' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-green-500/10 border-green-500/30 text-green-500'} animate-in fade-in`}>
          {mensagem.tipo === 'erro' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span className="text-sm font-semibold">{mensagem.texto}</span>
        </div>
      )}

      {carregandoDados ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#DC2626]"></div>
        </div>
      ) : (
        <form onSubmit={handleSalvarPreferencias} className="flex flex-col gap-8 pb-20 w-full animate-in fade-in">
          
          <section className="rounded-3xl p-6 md:p-8 w-full transition-colors duration-300 bg-[var(--bg-card)] border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-6 border-b pb-4 border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <CreditCard className="text-[#DC2626]" size={24} />
                <div>
                  <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--text-main)]">Resumo da Assinatura</h2>
                  <p className="text-xs text-[var(--text-main)] opacity-50 font-bold uppercase tracking-widest mt-1">{dadosAssinatura.modelo}</p>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest ${dadosAssinatura.status === 'Ativo' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {dadosAssinatura.status}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--bg-body)] border border-[var(--border-color)]">
                <div className="p-3 rounded-full bg-blue-500/10 text-blue-500"><Users size={20} /></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)] opacity-50">Clientes Ativos</span>
                  <span className="text-xl font-bold text-[var(--text-main)]">{dadosAssinatura.alunosAtivos}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--bg-body)] border border-[var(--border-color)]">
                <div className="p-3 rounded-full bg-purple-500/10 text-purple-500"><ShoppingCart size={20} /></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)] opacity-50">Compraram no Mês</span>
                  <span className="text-xl font-bold text-[var(--text-main)]">{dadosAssinatura.clientesCompraramMes}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--bg-body)] border border-[var(--border-color)]">
                <div className="p-3 rounded-full bg-orange-500/10 text-orange-500"><FileText size={20} /></div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-main)] opacity-50">Estimativa Próx. Fatura</span>
                  <span className="text-xl font-bold text-[var(--text-main)]">{estimativaFatura}</span>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl p-6 md:p-8 w-full transition-colors duration-300 bg-[var(--bg-card)] border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-6 border-b pb-4 border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <FileText className="text-[#DC2626]" size={24} />
                <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--text-main)]">Termos de Serviço (EULA)</h2>
              </div>
              <button type="button" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-body)] border border-[var(--border-color)] text-[var(--text-main)] opacity-70 hover:opacity-100 transition-all text-[11px] font-bold uppercase tracking-widest hover:border-[#DC2626]">
                <Download size={14} /> Baixar PDF
              </button>
            </div>
            
            <div className="w-full mb-6">
              <textarea 
                readOnly 
                value={textoContrato} 
                className="w-full h-48 p-5 rounded-2xl bg-[var(--bg-body)] border border-[var(--border-color)] text-[var(--text-main)] text-sm font-medium leading-relaxed outline-none resize-none custom-scrollbar opacity-80"
              />
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-body)] opacity-80 cursor-not-allowed">
              <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                <input 
                  type="checkbox" 
                  checked={true}
                  readOnly
                  disabled
                  className="peer appearance-none w-6 h-6 border-2 border-[var(--border-color)] rounded-md checked:bg-[#DC2626] checked:border-[#DC2626] cursor-not-allowed grayscale"
                />
                <CheckCircle size={16} className="absolute text-white pointer-events-none" strokeWidth={3} />
              </div>
              <div className="flex flex-col w-full">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-bold text-[var(--text-main)]">
                    Contrato de Licenciamento Aceito.
                  </span>
                  <Lock size={14} className="text-[var(--text-main)] opacity-50" />
                </div>
                <span className="text-[11px] text-[var(--text-main)] opacity-50 mt-1 uppercase tracking-wider font-bold">
                  IP Registrado: {dadosAssinatura.ipAceite} &bull; Em: {dadosAssinatura.dataAceite}
                </span>
                <p className="text-xs text-[#DC2626] font-medium mt-2 bg-[#DC2626]/10 p-2 rounded-lg">
                  *O aceite do contrato é irrevogável enquanto a conta estiver ativa. Para rescindir, utilize a opção de exclusão de conta abaixo.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl p-6 md:p-8 w-full transition-colors duration-300 bg-[var(--bg-card)] border border-[var(--border-color)]">
            <div className="flex items-center gap-3 mb-6 border-b pb-4 border-[var(--border-color)]">
              <ShieldCheck className="text-[#DC2626]" size={24} />
              <h2 className="text-lg font-bold uppercase tracking-wider text-[var(--text-main)]">Consentimentos (LGPD)</h2>
            </div>
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ConsentToggle 
                icone={Bell}
                titulo="Comunicações do Sistema"
                descricao="Autorizo o GymCtrlBase a enviar informações sobre o sistema, como novidades, updates, correções e manutenções programadas."
                checked={consenteSistema}
                onChange={setConsenteSistema}
                labelStatus={consenteSistema ? "Habilitado" : "Desabilitado"}
              />

              <ConsentToggle 
                icone={AlertCircle}
                titulo="Ofertas e Oportunidades"
                descricao="Autorizo o GymCtrlBase a enviar ofertas, dicas de gestão e novas oportunidades comerciais para alavancar a minha academia."
                checked={consenteOfertas}
                onChange={setConsenteOfertas}
                labelStatus={consenteOfertas ? "Habilitado" : "Desabilitado"}
              />
            </div>
          </section>

          <section className="rounded-3xl p-6 md:p-8 w-full transition-colors duration-300 bg-[var(--bg-card)] border border-red-500/30 relative overflow-hidden">
            <div className="absolute inset-0 bg-red-500/5 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-red-500/20 text-red-500 shrink-0">
                  <AlertCircle size={24} />
                </div>
                <div className="flex flex-col">
                  <h2 className="text-lg font-bold uppercase tracking-wider text-red-500">Exclusão de Conta</h2>
                  <p className="text-xs text-[var(--text-main)] opacity-70 mt-1 leading-relaxed max-w-xl">
                    Ao encerrar sua conta, todos os dados da sua academia, cadastros de alunos, relatórios e histórico financeiro serão <strong>apagados permanentemente</strong> dos servidores do GymCtrlBase, rescindindo este contrato e interrompendo o faturamento.
                  </p>
                </div>
              </div>
              
              <button 
                type="button" 
                onClick={handleExcluirConta}
                className="shrink-0 px-6 py-3 rounded-xl border border-red-500 text-red-500 hover:bg-red-500 hover:text-white text-sm font-bold uppercase tracking-wider transition-all"
              >
                Solicitar Exclusão
              </button>
            </div>
          </section>

          <div className="flex items-center justify-end gap-4 mt-2">
            <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-colors text-[var(--text-main)] opacity-60 hover:opacity-100 hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border-color)]">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-8 py-3 bg-[#DC2626] hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)]">
              <Save size={18} /> {loading ? "Salvando..." : "Salvar Preferências"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}