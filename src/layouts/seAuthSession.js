import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useAuthSession = (timeoutMinutes = 5) => {
  const navigate = useNavigate();

  useEffect(() => {
    const timeoutMilliseconds = timeoutMinutes * 60 * 1000;

    const handleLogout = () => {
      localStorage.removeItem('@App:token');
      navigate('/login');
    };

    let sessionTimer = setTimeout(handleLogout, timeoutMilliseconds);

    const resetTimer = () => {
      clearTimeout(sessionTimer);
      sessionTimer = setTimeout(handleLogout, timeoutMilliseconds);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    return () => {
      clearTimeout(sessionTimer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [navigate, timeoutMinutes]);
};