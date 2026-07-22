/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { KaraokeProvider, useKaraoke } from './context/KaraokeContext';
import { PublicView } from './views/PublicView';
import { DJLogin } from './views/DJLogin';
import { DJDashboard } from './views/DJDashboard';
import { AdminTables } from './views/AdminTables';
import { Home } from './views/Home';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useKaraoke();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <div className="text-app-accent animate-pulse font-black uppercase tracking-widest text-[10px]">Cargando Jumic...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/dj/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <KaraokeProvider>
      <Router>
        <Routes>
          {/* Public Home Page */}
          <Route path="/" element={<Home />} />

          {/* Public Route for Tables */}
          <Route path="/mesa/:tableId" element={<PublicView />} />
          
          {/* DJ Routes */}
          <Route path="/dj/login" element={<DJLogin />} />
          <Route 
            path="/dj/dashboard" 
            element={
              <ProtectedRoute>
                <DJDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dj/tables" 
            element={
              <ProtectedRoute>
                <AdminTables />
              </ProtectedRoute>
            } 
          />

          {/* Fallback to Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </KaraokeProvider>
  );
}
