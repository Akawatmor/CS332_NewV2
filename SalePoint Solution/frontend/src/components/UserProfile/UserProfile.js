import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Button,
  TextField,
  Grid,
  Divider,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Paper
} from '@mui/material';
import {
  Person as PersonIcon,
  Edit as EditIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  History as HistoryIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocationOn as LocationIcon,
  Badge as BadgeIcon,
  Business as BusinessIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { authService } from '../../services/authService';
import { apiService } from '../../services/apiService';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [activityHistory, setActivityHistory] = useState([]);
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    salesAlerts: true,
    inventoryAlerts: true,
    systemUpdates: false
  });

  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    location: '',
    bio: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const currentUser = authService.getCurrentUser();
  const userRole = authService.getUserRole();

  useEffect(() => {
    if (currentUser) {
      fetchUserProfile();
      fetchActivityHistory();
    }
  }, [currentUser]);

  const fetchUserProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.get(`/users/${currentUser.sub || currentUser.userId}`);
      setUser(response.data);
      setEditData({
        firstName: response.data.firstName || '',
        lastName: response.data.lastName || '',
        email: response.data.email || '',
        phone: response.data.phone || '',
        department: response.data.department || '',
        position: response.data.position || '',
        location: response.data.location || '',
        bio: response.data.bio || ''
      });
    } catch (err) {
      setError('Failed to fetch user profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityHistory = async () => {
    try {
      const response = await apiService.get(`/users/${currentUser.sub || currentUser.userId}/activity`);
      setActivityHistory(response.data.slice(0, 10)); // Show last 10 activities
    } catch (err) {
      console.error('Failed to fetch activity history:', err);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiService.put(`/users/${currentUser.sub || currentUser.userId}`, editData);
      setUser(response.data);
      setSuccess('Profile updated successfully');
      setEditMode(false);
    } catch (err) {
      setError('Failed to update profile: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await apiService.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setSuccess('Password changed successfully');
      setChangePasswordOpen(false);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (err) {
      setError('Failed to change password: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationChange = async (setting, value) => {
    const updatedNotifications = {
      ...notifications,
      [setting]: value
    };
    setNotifications(updatedNotifications);

    try {
      await apiService.put(`/users/${currentUser.sub || currentUser.userId}/notifications`, updatedNotifications);
      setSuccess('Notification preferences updated');
    } catch (err) {
      setError('Failed to update notification preferences');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'manager':
        return 'warning';
      case 'sales':
        return 'info';
      default:
        return 'default';
    }
  };

  const formatActivityDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading && !user) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        User Profile
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  Profile Information
                </Typography>
                <Button
                  startIcon={editMode ? <CancelIcon /> : <EditIcon />}
                  onClick={() => {
                    if (editMode) {
                      setEditData({
                        firstName: user?.firstName || '',
                        lastName: user?.lastName || '',
                        email: user?.email || '',
                        phone: user?.phone || '',
                        department: user?.department || '',
                        position: user?.position || '',
                        location: user?.location || '',
                        bio: user?.bio || ''
                      });
                    }
                    setEditMode(!editMode);
                  }}
                >
                  {editMode ? 'Cancel' : 'Edit'}
                </Button>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="First Name"
                    value={editMode ? editData.firstName : user?.firstName || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, firstName: e.target.value }))}
                    disabled={!editMode}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Last Name"
                    value={editMode ? editData.lastName : user?.lastName || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, lastName: e.target.value }))}
                    disabled={!editMode}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    value={editMode ? editData.email : user?.email || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                    disabled={!editMode}
                    type="email"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={editMode ? editData.phone : user?.phone || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, phone: e.target.value }))}
                    disabled={!editMode}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Department"
                    value={editMode ? editData.department : user?.department || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, department: e.target.value }))}
                    disabled={!editMode}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Position"
                    value={editMode ? editData.position : user?.position || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, position: e.target.value }))}
                    disabled={!editMode}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Location"
                    value={editMode ? editData.location : user?.location || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, location: e.target.value }))}
                    disabled={!editMode}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Bio"
                    value={editMode ? editData.bio : user?.bio || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, bio: e.target.value }))}
                    disabled={!editMode}
                    multiline
                    rows={3}
                  />
                </Grid>
              </Grid>

              {editMode && (
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSaveProfile}
                    disabled={loading}
                  >
                    {loading ? <CircularProgress size={20} /> : 'Save Changes'}
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Profile Summary */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <Avatar
                sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'primary.main' }}
              >
                <PersonIcon sx={{ fontSize: 40 }} />
              </Avatar>
              <Typography variant="h6">
                {user?.firstName} {user?.lastName}
              </Typography>
              <Chip
                label={userRole?.toUpperCase() || 'USER'}
                color={getRoleColor(userRole)}
                size="small"
                sx={{ mb: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                {user?.position || 'Sales Team Member'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.department || 'Sales Department'}
              </Typography>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Quick Actions
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<LockIcon />}
                onClick={() => setChangePasswordOpen(true)}
                sx={{ mb: 1 }}
              >
                Change Password
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Notification Preferences */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                <NotificationsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Notification Preferences
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.emailNotifications}
                    onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                  />
                }
                label="Email Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.smsNotifications}
                    onChange={(e) => handleNotificationChange('smsNotifications', e.target.checked)}
                  />
                }
                label="SMS Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.salesAlerts}
                    onChange={(e) => handleNotificationChange('salesAlerts', e.target.checked)}
                  />
                }
                label="Sales Alerts"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.inventoryAlerts}
                    onChange={(e) => handleNotificationChange('inventoryAlerts', e.target.checked)}
                  />
                }
                label="Inventory Alerts"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.systemUpdates}
                    onChange={(e) => handleNotificationChange('systemUpdates', e.target.checked)}
                  />
                }
                label="System Updates"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Activity History */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Recent Activity
              </Typography>
              <List>
                {activityHistory.length > 0 ? (
                  activityHistory.map((activity, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={activity.action}
                        secondary={formatActivityDate(activity.timestamp)}
                      />
                    </ListItem>
                  ))
                ) : (
                  <ListItem>
                    <ListItemText
                      primary="No recent activity"
                      secondary="Your recent actions will appear here"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Change Password Dialog */}
      <Dialog
        open={changePasswordOpen}
        onClose={() => setChangePasswordOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Password"
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="New Password"
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                required
                helperText="Password must be at least 8 characters long"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                error={passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword}
                helperText={
                  passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                    ? "Passwords do not match"
                    : ""
                }
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleChangePassword}
            variant="contained"
            disabled={
              !passwordData.currentPassword ||
              !passwordData.newPassword ||
              !passwordData.confirmPassword ||
              passwordData.newPassword !== passwordData.confirmPassword ||
              loading
            }
          >
            {loading ? <CircularProgress size={20} /> : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserProfile;
