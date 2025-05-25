import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container, Box, CircularProgress } from '@mui/material';

// Components
import Navigation from './components/Navigation/Navigation';
import Dashboard from './components/Dashboard/Dashboard';
import Products from './components/Products/Products';
import Customers from './components/Customers/Customers';
import Sales from './components/Sales/Sales';
import Inventory from './components/Inventory/Inventory';
import Analytics from './components/Analytics/Analytics';
import Documents from './components/Documents/Documents';
import UserProfile from './components/UserProfile/UserProfile';

function App() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState('admin'); // Default to admin for demo

  // Mock user object for demo
  const mockUser = {
    username: 'demo@salepoint.com',
    attributes: {
      email: 'demo@salepoint.com',
      name: 'Demo User',
      'custom:role': 'admin'
    }
  };

  useEffect(() => {
    // Simulate initialization
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleSignOut = () => {
    console.log('Sign out clicked (demo mode)');
    // In demo mode, just reload the page
    window.location.reload();
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        flexDirection="column"
      >
        <CircularProgress size={60} />
        <Box mt={2} textAlign="center">
          <h2 style={{ color: '#1976d2', margin: '16px 0 8px 0' }}>Sale Point</h2>
          <p style={{ color: '#666', margin: 0 }}>Loading Dashboard...</p>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Navigation
        user={mockUser}
        userRole={userRole}
        onSignOut={handleSignOut}
      />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - 240px)` },
          ml: { sm: '240px' },
        }}
      >
        <Container maxWidth="xl">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard userRole={userRole} />} />
            <Route path="/products" element={<Products userRole={userRole} />} />
            <Route path="/customers" element={<Customers userRole={userRole} />} />
            <Route path="/sales" element={<Sales userRole={userRole} />} />
            <Route path="/inventory" element={<Inventory userRole={userRole} />} />
            <Route path="/analytics" element={<Analytics userRole={userRole} />} />
            <Route path="/documents" element={<Documents userRole={userRole} />} />
            <Route path="/profile" element={<UserProfile user={mockUser} />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Container>
      </Box>
    </Box>
  );
}

export default App;
