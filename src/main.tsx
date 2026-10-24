import React from 'react';import{createRoot}from'react-dom/client';import App from './App';import {AdminDashboard} from './features/admin/AdminDashboard';import './styles/index.css';
createRoot(document.getElementById('root')!).render(<React.StrictMode>{window.location.pathname.replace(/\/$/,'')==='/admin'?<AdminDashboard/>:<App/>}</React.StrictMode>);
