import { useState, useCallback } from 'react';
import api from '../services/api';

export const useAgendamentos = () => {
  const [loading, setLoading] = useState(false);

  const listarPorUnidade = useCallback(async (idUnidade, inicio, fim) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/agendamentos/unidade/${idUnidade}`, {
        params: { inicio, fim }
      });
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const criarAgendamento = useCallback(async (dados) => {
    setLoading(true);
    try {
      const { data } = await api.post('/agendamentos', dados);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelarAgendamento = useCallback(async (id, motivo) => {
    setLoading(true);
    try {
      const { data } = await api.patch(`/agendamentos/${id}/cancelar`, { 
        motivoCancelamento: motivo 
      });
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  const concluirAgendamento = useCallback(async (id) => {
    setLoading(true);
    try {
      const { data } = await api.patch(`/agendamentos/${id}/concluir`);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, listarPorUnidade, criarAgendamento, cancelarAgendamento, concluirAgendamento };
};