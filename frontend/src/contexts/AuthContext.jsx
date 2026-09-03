import React, { createContext, useContext, useState, useEffect } from "react";
import { setAccessToken as setApiAccessToken } from "../lib/api/tokenStore";

const AuthContext = createContext(undefined);

export const useAuth =  () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }

  return context;
}

// access token for non-hook modules is synced to the token store

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState("");

  const backendURL = import.meta.env.VITE_API_BACKEND;

  const apiRequest = async (url, options = {}) => {
    const token = accessToken;

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      credentials: "include"
    };

    let response = await fetch(`${backendURL}${url}`, config);

    if (response.status === 401 && token) {// means forbidden...unauthorized
      try {
        const refreshResponse = await fetch(`${backendURL}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (refreshResponse.ok) {
          const data = await refreshResponse.json();
          setAccessToken(data.accessToken);
          setUser(data.user);

          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${data.accessToken}`,
          };
          response = await fetch(`${backendURL}${url}`, config);
        } else {
          setAccessToken("");
          setUser(null);
        }
        } catch (error) {
        console.error('Token refresh failed:', error);
          setAccessToken("");
        setUser(null);
      }
    }

    return response;
  }

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) {
      return parts.pop().split(';').shift();
    }
    return null;
  };

  useEffect(() => {
    const initAuth = async () => {
      const refreshToken = getCookie('refreshToken');

      if (refreshToken) {
        try {
          const response = await apiRequest(`/api/user/profile`);
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
          }
          // token (if any) will be synced via effect below
        } catch (error) {
          console.error('Session check failed:', error);
        }
      }
      
      setLoading(false);
    };
  
    initAuth();
  }, []);

  const register = async ( email, fullName, password, confirmPassword, organization, department, role ) => {
    try {
      if ( !email || !fullName || !password || !confirmPassword || !organization || !department || !role) {
        throw new Error("Some fields are missing");
      }

      const response = await fetch(`${backendURL}/api/auth/register`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, password, confirmPassword, organization, department, role }),
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.json();
        console.log(error);
        throw new Error(error.error || error.errors?.[0]?.msg || 'Registration failed');
      }

      return response;
    } catch (error) {
      console.error("Error registering user: ", error);
    }
  }

  const login = async (email, password) => {
    try {
      if (!email || !password) {
        throw new Error("some fields are empty");
      }

      const response = await fetch(`${backendURL}/api/auth/login`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.errors?.[0]?.msg || 'Registration failed');
      }

      const data = await response.json();
      setAccessToken(data.accessToken);
      setUser(data.user);
    } catch (error) {
      console.error(error);
    }
  }

  const logout = async (devices) => {
    try {
      const response = await apiRequest(`/api/auth/logout`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices: devices }),
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.errors?.[0]?.msg || 'Logout failed');
      }

      setAccessToken("");
      setUser(null);
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  }

  const value = {
    user,
    loading,
    accessToken,
    apiRequest,
    logout,
    register,
    login,
  }

  useEffect(() => {
    setApiAccessToken(accessToken);
  }, [accessToken]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}


// import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// import { supabase } from '../lib/supabase';

// // interface Profile {
// //   id: string;
// //   full_name: string;
// //   department: string | null;
// //   organization: string;
// //   role: 'student' | 'researcher' | 'faculty' | 'employee' | 'manager' | 'admin';
// // }

// // interface AuthContextType {
// //   user: User | null;
// //   profile: Profile | null;
// //   session: Session | null;
// //   loading: boolean;
// //   signUp: (email: string, password: string, profileData: Omit<Profile, 'id'>) => Promise<void>;
// //   signIn: (email: string, password: string) => Promise<void>;
// //   signOut: () => Promise<void>;
// // }

// const AuthContext = createContext(undefined);

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const [profile, setProfile] = useState(null);
//   const [session, setSession] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     supabase.auth.getSession().then(({ data: { session } }) => {
//       setSession(session);
//       setUser(session?.user ?? null);
//       if (session?.user) {
//         loadProfile(session.user.id);
//       } else {
//         setLoading(false);
//       }
//     });

//     const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
//       (async () => {
//         setSession(session);
//         setUser(session?.user ?? null);
//         if (session?.user) {
//           await loadProfile(session.user.id);
//         } else {
//           setProfile(null);
//           setLoading(false);
//         }
//       })();
//     });

//     return () => subscription.unsubscribe();
//   }, []);

//   async function loadProfile(userId) {
//     try {
//       const { data, error } = await supabase
//         .from('profiles')
//         .select('*')
//         .eq('id', userId)
//         .maybeSingle();

//       if (error) throw error;
//       setProfile(data);
//     } catch (error) {
//       console.error('Error loading profile:', error);
//     } finally {
//       setLoading(false);
//     }
//   }

//   async function signUp(email, password, profileData) {
//     console.log(email, password, profileData);
//     // const { data: authData, error: authError } = await supabase.auth.signUp({
//     //   email,
//     //   password,
//     // });

//     // if (authError) throw authError;
//     // if (!authData.user) throw new Error('User creation failed');

//     // const { error: profileError } = await supabase
//     //   .from('profiles')
//     //   .insert({
//     //     id: authData.user.id,
//     //     ...profileData,
//     //   });

//     // if (profileError) throw profileError;
//   }

//   async function signIn(email, password) {
//     const { error } = await supabase.auth.signInWithPassword({
//       email,
//       password,
//     });

//     if (error) throw error;
//   }

//   async function signOut() {
//     const { error } = await supabase.auth.signOut();
//     if (error) throw error;
//   }

//   const value = {
//     user,
//     profile,
//     session,
//     loading,
//     signUp,
//     signIn,
//     signOut,
//   };

//   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
// }

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (context === undefined) {
//     throw new Error('useAuth must be used within an AuthProvider');
//   }
//   return context;
// }
