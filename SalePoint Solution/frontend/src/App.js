import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Container, Box, CircularProgress } from '@mui/material';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

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

// Services
import { authService } from './services/authService';

function App() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          const role = await authService.getUserRole();
          setUserRole(role);
        }
      } catch (error) {
        console.log('No authenticated user');
      } finally {
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      setUserRole(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Authenticator
      components={{
        Header() {
          return (
            <Box textAlign="center" py={3}>
              <h1 style={{ color: '#1976d2', margin: 0 }}>Sale Point</h1>
              <p style={{ color: '#666', margin: '8px 0 0 0' }}>
                Centralized Sales Data Platform
              </p>
            </Box>
          );
        },
      }}
      formFields={{
        signUp: {
          email: {
            order: 1,
            placeholder: 'Enter your email address',
          },
          name: {
            order: 2,
            placeholder: 'Enter your full name',
          },
          password: {
            order: 3,
            placeholder: 'Enter your password',
          },
          confirm_password: {
            order: 4,
            placeholder: 'Confirm your password',
          },
        },
      }}
    >
      {({ signOut, user }) => (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
          <Navigation
            user={user}
            userRole={userRole}
            onSignOut={signOut}
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
                <Route path="/profile" element={<UserProfile user={user} />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Container>
          </Box>
        </Box>
      )}
    </Authenticator>
  );
}

export default App;
