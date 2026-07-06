import React, { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { CarrinhoProvider } from "./context/CarrinhoContext.jsx"; 
import { ThemeProvider } from "./context/ThemeContext.jsx"; 
import { AuthProvider } from "./context/AuthContext.jsx";
import SessionGuard from "./components/auth/SessionGuard.jsx"; 
import MainLayout from "./layouts/MainLayout.jsx"; 
import PrivateRoute from "./routes/PrivateRoute.jsx";
import LoginCadastro from "./pages/auth/LoginCadastro.jsx"; 
import ModalEsqueci from "./components/modal/ModalEsqueci.jsx";
import ModalAtivacao from "./components/modal/ModalAtivacao.jsx";
import ModalEntrada from "./components/modal/ModalEntrada.jsx";
import ModalSelecaoUnidade from "./components/auth/ModalSelecaoUnidade.jsx";
import ModalEmBreve from "./components/modal/ModalEmBreve.jsx";

const Home = lazy(() => import("./pages/Home.jsx"));
const Agenda = lazy(() => import("./pages/agenda/Agenda.jsx")); 
const Vendas = lazy(() => import("./pages/pdv/Vendas.jsx"));
const Clientes = lazy(() => import("./pages/usuario/Clientes.jsx"));
const ClientePerfil = lazy(() => import("./pages/usuario/ClientePerfil.jsx"));
const AvaliacaoFisicaLista = lazy(() => import("./pages/agenda/AvaliacaoFisicaLista.jsx"));
const NovaAvaliacao = lazy(() => import("./pages/agenda/NovaAvaliacao.jsx"));
const Estoque = lazy(() => import("./pages/estoque/Estoque.jsx"));
const ListaCompras = lazy(() => import("./pages/estoque/ListaCompras.jsx"));
const Financeiro = lazy(() => import("./pages/financeiro/Financeiro.jsx"));
const Caixa = lazy(() => import("./pages/financeiro/Caixa.jsx"));
const ContasReceber = lazy(() => import("./pages/financeiro/ContasReceber.jsx")); 
const ConferenciaCaixa = lazy(() => import("./pages/financeiro/ConferenciaCaixa.jsx"));
const Ajustes = lazy(() => import("./pages/Ajustes.jsx")); 
const Gerencia = lazy(() => import("./pages/admin/Gerencia.jsx"));
const GerenciarCupons = lazy(() => import("./pages/admin/GerenciarCupons.jsx")); 
const DadosNegocio = lazy(() => import("./pages/admin/DadosNegocio.jsx"));
const PrivacidadeLGPD = lazy(() => import("./pages/admin/PrivacidadeLGPD.jsx")); 
const BackupSistema = lazy(() => import("./pages/admin/BackupSistema.jsx")); 
const Permissoes = lazy(() => import("./pages/admin/Permissoes.jsx"));
const Colaboradores = lazy(() => import("./pages/usuario/Colaboradores.jsx"));
const Voucher = lazy(() => import("./pages/admin/Voucher.jsx"));
const Relatorios = lazy(() => import("./pages/relatorios/Relatorios.jsx"));
const RelatoriosVendas = lazy(() => import("./pages/relatorios/RelatoriosVendas.jsx"));
const RelatorioEstoque = lazy(() => import("./pages/relatorios/RelatorioEstoque.jsx"));
const RelatorioFinanceiro = lazy(() => import("./pages/relatorios/RelatorioFinanceiro.jsx"));
const RelatorioDesempenho = lazy(() => import("./pages/relatorios/RelatorioDesempenho.jsx"));
const RelatoriosAvaliacao = lazy(() => import("./pages/relatorios/RelatoriosAvaliacao.jsx"));
const RelatorioMovimentacoes = lazy(() => import("./pages/relatorios/RelatorioMovimentacoes.jsx"));
const RelatorioAgenda = lazy(() => import("./pages/relatorios/RelatorioAgenda.jsx"));
const RelatoriosClientes = lazy(() => import("./pages/relatorios/RelatoriosClientes.jsx"));
const Integracoes = lazy(() => import("./pages/admin/Integracoes.jsx")); 
const RelatoriosUnidades = lazy(() => import("./pages/relatorios/RelatoriosUnidades.jsx"));
const Administrativo = lazy(() => import("./pages/admin/Administrativo.jsx"));
const Comissoes = lazy(() => import("./pages/admin/Comissoes.jsx"));
const PerfilColaborador = lazy(() => import("./pages/usuario/PerfilColaborador.jsx"));

const GESTAO = ["ADMIN", "DONO", "GERENTE"];
const COMERCIAL = [...GESTAO, "LIDER_VENDA"];
const ATENDIMENTO = [...COMERCIAL, "RECEPCIONISTA"];
const PROFESSORES = ["PERSONAL_TRAINER", "PROFESSOR", "INSTRUTOR"];
const FUNCIONARIOS = [...ATENDIMENTO, ...PROFESSORES];

const PageLoader = () => (
  <div className="w-full h-screen flex items-center justify-center bg-[var(--bg-body)]">
    <div className="w-8 h-8 rounded-full border-4 border-[var(--bg-sidebar)] border-t-transparent animate-spin" />
  </div>
);

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CarrinhoProvider>
          <SessionGuard>
            
            {/* Modais de Escopo Global */}
            <ModalEsqueci />
            <ModalAtivacao />
            <ModalEntrada />
            <ModalSelecaoUnidade />
            <ModalEmBreve /> 

            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/login" element={<LoginCadastro />} />
                  
                  <Route element={<PrivateRoute />}>
                    <Route element={<MainLayout />}>
                      <Route path="/home" element={<Home />} />

                      <Route element={<PrivateRoute cargosPermitidos={FUNCIONARIOS} />}>
                        <Route path="/agenda" element={<Agenda />} />
                        <Route path="/clientes" element={<Clientes />} />
                        <Route path="/clientes/:id" element={<ClientePerfil />} />
                        <Route path="/avaliacoes" element={<AvaliacaoFisicaLista />} />
                        <Route path="/avaliacoes/nova" element={<NovaAvaliacao />} />
                        <Route path="/avaliacoes/cliente/:id" element={<NovaAvaliacao />} />
                      </Route>

                      <Route element={<PrivateRoute cargosPermitidos={ATENDIMENTO} />}>
                        <Route path="/vendas" element={<Vendas />} />
                      </Route>

                      <Route element={<PrivateRoute cargosPermitidos={COMERCIAL} />}>
                        <Route path="/estoque" element={<Estoque />} />
                        <Route path="/caixa" element={<Caixa />} />
                        <Route path="/relatorios" element={<Relatorios />} />
                        <Route path="/relatorios/vendas" element={<RelatoriosVendas />} />
                        <Route path="/relatorios/desempenho" element={<RelatorioDesempenho />} />
                        <Route path="/admin/voucher" element={<Voucher />} />
                        <Route path="/gerencia/cupons" element={<GerenciarCupons />} />
                      </Route>
                      
                      <Route element={<PrivateRoute cargosPermitidos={GESTAO} />}>
                        <Route path="/ajustes" element={<Ajustes />} />
                        <Route path="/estoque/lista-compras" element={<ListaCompras />} />
                        <Route path="/financeiro" element={<Financeiro />} />
                        <Route path="/financeiro/conferencia" element={<ConferenciaCaixa />} />
                        <Route path="/financeiro/contas-receber" element={<ContasReceber />} />
                        
                        <Route path="/relatorios/estoque" element={<RelatorioEstoque />} />
                        <Route path="/relatorios/financeiro" element={<RelatorioFinanceiro />} />
                        <Route path="/relatorios/avaliacoes" element={<RelatoriosAvaliacao />} />
                        <Route path="/relatorios/movimentacoes" element={<RelatorioMovimentacoes />} />
                        <Route path="/relatorios/agenda" element={<RelatorioAgenda />} />
                        <Route path="/relatorios/clientes" element={<RelatoriosClientes />} />
                        <Route path="/relatorios/unidades" element={<RelatoriosUnidades />} />

                        <Route path="/admin/colaboradores" element={<Colaboradores />} />
                        <Route path="/admin/colaboradores/:id" element={<PerfilColaborador />} />
                        
                        <Route path="/admin/administrativo" element={<Administrativo />} />
                        <Route path="/admin/comissoes" element={<Comissoes />} />
                        
                        <Route path="/admin/dados-negocio" element={<DadosNegocio />} />
                        <Route path="/admin/privacidade" element={<PrivacidadeLGPD />} />
                        <Route path="/admin/backup" element={<BackupSistema />} />
                        <Route path="/admin/permissoes" element={<Permissoes />} />
                        <Route path="/gerencia" element={<Gerencia />} />
                        <Route path="/admin/integracoes" element={<Integracoes />} />
                      </Route>

                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/home" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </SessionGuard>
        </CarrinhoProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}