import { Auth } from 'aws-amplify';

class AuthService {
  async getCurrentUser() {
    try {
      return await Auth.currentAuthenticatedUser();
    } catch (error) {
      return null;
    }
  }

  async getUserRole() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      const groups = user.signInUserSession?.accessToken?.payload['cognito:groups'] || [];
      
      if (groups.includes('Admin')) return 'admin';
      if (groups.includes('Manager')) return 'manager';
      if (groups.includes('SalesStaff')) return 'sales';
      
      // Default role based on custom attributes
      const customRole = user.attributes['custom:role'];
      return customRole || 'sales';
    } catch (error) {
      console.error('Error getting user role:', error);
      return 'sales';
    }
  }

  async signOut() {
    try {
      await Auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  async updateUserAttributes(attributes) {
    try {
      const user = await Auth.currentAuthenticatedUser();
      return await Auth.updateUserAttributes(user, attributes);
    } catch (error) {
      console.error('Error updating user attributes:', error);
      throw error;
    }
  }

  async getJwtToken() {
    try {
      const session = await Auth.currentSession();
      return session.getIdToken().getJwtToken();
    } catch (error) {
      console.error('Error getting JWT token:', error);
      return null;
    }
  }

  async refreshSession() {
    try {
      const user = await Auth.currentAuthenticatedUser();
      return await Auth.currentSession();
    } catch (error) {
      console.error('Error refreshing session:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
