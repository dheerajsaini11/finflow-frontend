import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#0a0e1a',
        color: '#00f5a0',
        fontSize: '18px'
      }}>
        Loading FinFlow...
      </div>
    );
  }

  return token ? children : <Navigate to="/login" />;
};

export default PrivateRoute;