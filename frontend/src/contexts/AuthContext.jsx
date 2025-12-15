import React, { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(undefined);

export const useAuth =  () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const backendURL = import.meta.env.VITE_API_BACKEND

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');

      if (token) {
        try {
          const response = await apiRequest(`/api/user/profile`);
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            console.log(user);
          }
        } catch (error) {
          console.error('Session check failed:', error);
        }
      }
      
      setLoading(false);
    };
  
    initAuth();
  }, []);

  const apiRequest = async (url, options = {}) => {
    const token = localStorage.getItem("accessToken");

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

    if (response.status === 401 && token) {
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
          localStorage.setItem('accessToken', data.accessToken);
          setUser(data.user);

          config.headers = {
            ...config.headers,
            Authorization: `Bearer ${data.accessToken}`,
          };
          response = await fetch(`${backendURL}${url}`, config);
        } else {
          localStorage.removeItem('accessToken');
          setUser(null);
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        localStorage.removeItem('accessToken');
        setUser(null);
      }
    }

    return response;
  }

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
      localStorage.setItem("accessToken", data.accessToken);
      setUser(data.user);
    } catch (error) {
      console.error(error);
    }
  }

  const logout = async (user) => {
    try {
      const response = await apiRequest(`/api/auth/logout`, {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || error.errors?.[0]?.msg || 'Logout failed');
      }

      localStorage.removeItem("accessToken");
      setUser(null);
    } catch (error) {
      console.error("Error logging out: ", error);
    }
  }

  const value = {
    user,
    loading,
    logout,
    register,
    login,
  }

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
