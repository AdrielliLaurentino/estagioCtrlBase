import { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';

export function useAvisos(intervaloMs = 60000) {
  const [avisos, setAvisos] = useState([]);
  const [hasPermissionError, setHasPermissionError] = useState(false);
  
  useEffect(() => {
    let isActive = true;
    let intervalId;

    const carregarAvisos = async () => {
      if (hasPermissionError) return; 

      try {
        const res = await apiFetch('/avisos/ativos');
        const data = await res.json();
        if (isActive) setAvisos(data);
      } catch (error) {
        console.error("Falha ao buscar avisos:", error.message);
        
        if (error.message.includes("403") || error.message.includes("401")) {
            if (isActive) setHasPermissionError(true);
        }
      }
    };

    if (!hasPermissionError) {
      carregarAvisos();
      intervalId = setInterval(carregarAvisos, intervaloMs);
    }

    return () => {
      isActive = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [intervaloMs, hasPermissionError]);

  return avisos;
}