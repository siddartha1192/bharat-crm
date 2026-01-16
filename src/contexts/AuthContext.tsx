import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  role: 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER';
  profilePic?: string;
  tenantId?: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    plan: 'FREE' | 'STANDARD' | 'PROFESSIONAL' | 'ENTERPRISE';
    status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL' | 'CANCELLED';
    subscriptionStart: string | null;
    subscriptionEnd: string | null;
    settings: any;
  };
}

interface Tenant {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: string;
}

interface LoginResult {
  requiresTenantSelection?: boolean;
  tenants?: Tenant[];
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, tenantId?: string) => Promise<LoginResult>;
  loginWithGoogle: () => Promise<void>;
  register: (email: string, password: string, name: string, company?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check if user is logged in on mount
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUserId = localStorage.getItem('userId');

    if (storedToken && storedUserId) {
      setToken(storedToken);
      // Fetch user details
      fetchUserDetails(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  // Set up token refresh interval
  useEffect(() => {
    if (token) {
      // Refresh token every 6 days (token expires in 7 days)
      const refreshInterval = setInterval(() => {
        refreshToken();
      }, 6 * 24 * 60 * 60 * 1000); // 6 days

      return () => clearInterval(refreshInterval);
    }
  }, [token]);

  const fetchUserDetails = async (authToken: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user details');
      }

      const userData = await response.json();
      localStorage.setItem('user', JSON.stringify(userData)); // Store for RBAC
      setUser(userData);
      // Dispatch custom event to notify usePermissions hook
      window.dispatchEvent(new Event('user-updated'));
    } catch (error) {
      console.error('Error fetching user details:', error);
      // Clear invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, tenantId?: string): Promise<LoginResult> => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, tenantId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Check if tenant selection is required
      if (data.requiresTenantSelection) {
        return {
          requiresTenantSelection: true,
          tenants: data.tenants
        };
      }

      // Store tokens and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('user', JSON.stringify(data.user)); // Store complete user object for RBAC

      setToken(data.token);
      setUser(data.user);
      // Dispatch custom event to notify usePermissions hook
      window.dispatchEvent(new Event('user-updated'));

      return {};
    } catch (error) {
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const response = await fetch(`${API_URL}/auth/google/url`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get Google auth URL');
      }

      // Redirect to Google OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, company = '') => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, company }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      // Store tokens and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      localStorage.setItem('userId', data.user.id);
      localStorage.setItem('userRole', data.user.role);
      localStorage.setItem('user', JSON.stringify(data.user)); // Store complete user object for RBAC

      setToken(data.token);
      setUser(data.user);
      // Dispatch custom event to notify usePermissions hook
      window.dispatchEvent(new Event('user-updated'));
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('user'); // Remove user object for RBAC
      setToken(null);
      setUser(null);
      navigate('/login');
    }
  };

  const refreshToken = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken');

      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Token refresh failed');
      }

      // Update tokens
      localStorage.setItem('token', data.token);
      localStorage.setItem('refreshToken', data.refreshToken);
      setToken(data.token);
    } catch (error) {
      console.error('Token refresh error:', error);
      // If refresh fails, logout
      await logout();
    }
  };

  const hasRole = (...roles: string[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  const value = {
    user,
    token,
    loading,
    login,
    loginWithGoogle,
    register,
    logout,
    refreshToken,
    isAuthenticated: !!user && !!token,
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper function to get authorization headers
export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
  };
}
