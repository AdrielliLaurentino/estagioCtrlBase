import React, { useEffect } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PrivateRoute({ cargosPermitidos = [] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <span className="text-gray-400 font-medium text-sm animate-pulse">A verificar sessão...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  let isRestricted = false;
  
  if (cargosPermitidos.length > 0) {
    const rawCargo = user?.cargo || user?.perfilAcesso?.nome || user?.perfilAcesso || "";
    const cargoUsuario = String(rawCargo).toUpperCase();
    
    if (!cargosPermitidos.includes(cargoUsuario)) {
      isRestricted = true;
    }
  }

  if (isRestricted) {
    return <RestrictedModal user={user} attemptedPath={location.pathname} />;
  }

  return <Outlet />;
}

function RestrictedModal({ user, attemptedPath }) {
  const navigate = useNavigate();

  useEffect(() => {
    const reportAudit = async () => {
      if (!user?.token) return; // Segurança extra caso falte token
      
      try {
        const rawCargo = user?.cargo || user?.perfilAcesso?.nome || user?.perfilAcesso || "DESCONHECIDO";
        await fetch('/api/audit/access-denied', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            // Alteração principal: Envio do token para não sofrer block 403 do backend
            'Authorization': `Bearer ${user.token}` 
          },
          body: JSON.stringify({
            userId: user?.idFuncionario || user?.id,
            userName: user?.nomeCompleto || user?.nome,
            unitId: user?.idUnidade || user?.unidade?.id || user?.unidadeId || 1,
            attemptedPath: attemptedPath,
            role: rawCargo
          })
        });
      } catch (error) {
        console.error('Falha na telemetria de segurança', error);
      }
    };
    
    reportAudit();
  }, [user, attemptedPath]);

  const cargoVisual = user?.cargo || user?.perfilAcesso?.nome || user?.perfilAcesso || "Não Identificado";

  // Alteração: Estilização do modal ajustada para tons mais sóbrios e minimalistas
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full mx-4 border border-gray-100 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-200">
        
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-5 text-red-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <h2 className="text-lg font-bold text-gray-900 mb-2">Acesso Restrito</h2>
        
        <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">
          Seu perfil atual (<span className="font-semibold text-gray-800">{cargoVisual}</span>) não possui permissões para acessar esta área.
        </p>

        <button
          onClick={() => navigate('/home', { replace: true })}
          className="w-full bg-gray-900 text-white py-3 rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors outline-none"
        >
          Voltar ao Início
        </button>
      </div>
    </div>
  );
}