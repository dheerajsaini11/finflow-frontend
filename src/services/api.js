import axios from 'axios';

const API = axios.create({
  baseURL: 'http://finflow-backend-production-eb28.up.railway.app/api',
});

// Automatically attach token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('finflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const registerUser = (data) => API.post('/auth/register', data);
export const loginUser = (data) => API.post('/auth/login', data);
export const getProfile = () => API.get('/auth/profile');

// Transactions
export const addTransaction = (data) => API.post('/transactions', data);
export const getTransactions = (params) => API.get('/transactions', { params });
export const getTransaction = (id) => API.get(`/transactions/${id}`);
export const updateTransaction = (id, data) => API.put(`/transactions/${id}`, data);
export const deleteTransaction = (id) => API.delete(`/transactions/${id}`);
export const getMonthlySummary = (params) => API.get('/transactions/summary', { params });

// Categories
export const getCategories = (params) => API.get('/categories', { params });
export const addCategory = (data) => API.post('/categories', data);
export const updateCategory = (id, data) => API.put(`/categories/${id}`, data);
export const deleteCategory = (id) => API.delete(`/categories/${id}`);

// Dashboard
export const getDashboard = () => API.get('/dashboard');
export const getYearlyAnalytics = (params) => API.get('/dashboard/analytics', { params });

// Lend
export const getLendBalances = () => API.get('/lend');
export const getPersonTransactions = (name) => API.get(`/lend/${name}`);
export const settlePerson = (name) => API.put(`/lend/${name}/settle`);

// Budget
export const getBudgets = (params) => API.get('/budget', { params });
export const getBudgetSummary = (params) => API.get('/budget/summary', { params });
export const setBudget = (data) => API.post('/budget', data);
export const deleteBudget = (id) => API.delete(`/budget/${id}`);

// Streak
export const getStreak = () => API.get('/dashboard/streak');