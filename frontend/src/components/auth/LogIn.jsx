import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">

      <div className="absolute top-[-150px] right-[-200px] w-[400px] h-[400px] rounded-full 
        bg-[radial-gradient(circle,rgba(255,100,0,1.0)_0%,transparent_70%)]" />
      <div className="absolute bottom-[-170px] left-[-200px] w-[400px] h-[400px] rounded-full 
        bg-[radial-gradient(circle,rgba(255,100,0,1.0)_0%,transparent_70%)]" />

      <div className="w-full max-w-md">
        <div className="bg-black rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2 text-white">
              MemoryFlow
            </h1>
            <p className="text-white">
              Transform knowledge into power
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-12 py-3 
                            border border-gray-700 bg-black text-white placeholder-gray-400 
                            focus:outline-none focus:border-orange-500 transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 
                            border border-gray-700 bg-black text-white placeholder-gray-400 
                            focus:outline-none focus:border-orange-500 transition-colors pr-12"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200"
            >
              {loading ? 'Processing...' : 'Log in' }
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/register")}
              className="font-medium text-orange-500 hover:text-orange-400 transition-colors"
            >
              {'Need an account? Sign up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;