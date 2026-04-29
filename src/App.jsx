import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Budget from './pages/Budget';
import Lend from './pages/Lend';
import Insights from './pages/Insights';
import QuickEntry from './pages/QuickEntry';
import Profile from './pages/Profile';
import ExportCenter from './pages/ExportCenter';
import Navbar from './components/Navbar';
import ManageCategories from './pages/ManageCategories';
import ImportCenter from './pages/ImportCenter';
import './App.css';

const AppLayout = ({ children }) => (
  <div style={{ paddingBottom: '70px', minHeight: '100vh', background: '#0a0e1a' }}>
    {children}
    <Navbar />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#1a1f35',
              color: '#fff',
              border: '1px solid #2a2f45',
            },
          }}
        />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<PrivateRoute><AppLayout><Dashboard /></AppLayout></PrivateRoute>} />
          <Route path="/transactions" element={<PrivateRoute><AppLayout><Transactions /></AppLayout></PrivateRoute>} />
          <Route path="/analytics" element={<PrivateRoute><AppLayout><Analytics /></AppLayout></PrivateRoute>} />
          <Route path="/budget" element={<PrivateRoute><AppLayout><Budget /></AppLayout></PrivateRoute>} />
          <Route path="/lend" element={<PrivateRoute><AppLayout><Lend /></AppLayout></PrivateRoute>} />
          <Route path="/insights" element={<PrivateRoute><AppLayout><Insights /></AppLayout></PrivateRoute>} />
          <Route path="/entry" element={<PrivateRoute><AppLayout><QuickEntry /></AppLayout></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><AppLayout><Profile /></AppLayout></PrivateRoute>} />
          <Route path="/export" element={<PrivateRoute><AppLayout><ExportCenter /></AppLayout></PrivateRoute>} />
          <Route path="/categories" element={<PrivateRoute><AppLayout><ManageCategories /></AppLayout></PrivateRoute>} />
          <Route path="/import" element={<PrivateRoute><AppLayout><ImportCenter /></AppLayout></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;