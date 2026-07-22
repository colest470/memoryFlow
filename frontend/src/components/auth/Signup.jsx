import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [organization, setOrganization] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('employee');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const { register } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    setLoading(true);

    try {
      const response = await register(email, fullName, password, confirmPassword, organization, department, role);

      if (response.message) {
        setSuccess(response.message);
      } else {
        setError(response.error);
      } 

      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during sign up');
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
      <div className="w-full max-w-2xl">
        <div className="bg-black rounded-2xl shadow-2xl p-6 sm:p-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-extrabold text-white mb-3"> 
              MemoryFlow
            </h1>
            <p className="text-white text-lg">
              Transform knowledge into power
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6"> 
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg text-base"> 
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-1"> 
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete='on'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-4 py-3 
                            border border-gray-700 bg-black text-white placeholder-gray-400 
                            focus:outline-none focus:border-orange-500 transition-colors pr-12" 
                required
              />
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-white mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete='on'
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-4 py-3 
                            border border-gray-700 bg-black text-white placeholder-gray-400 
                            focus:outline-none focus:border-orange-500 transition-colors pr-12"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> 
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-white mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete='on'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-4 py-3 
                            border border-gray-700 bg-black text-white placeholder-gray-400 
                            focus:outline-none focus:border-orange-500 transition-colors pr-12 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff size={22} /> 
                    ) : (
                      <Eye size={22} />
                    )}
                  </button>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Must be at least 6 characters long
                </p>
              </div>

              <div>
                <label htmlFor="confirmPassword" autoComplete="on" className="block text-sm font-medium text-white mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    autoComplete='on'
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none rounded-lg relative block w-full px-4 py-3 
                            border border-gray-700 bg-black text-white placeholder-gray-400 
                            focus:outline-none focus:border-orange-500 transition-colors pr-12 pr-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={22} />
                    ) : (
                      <Eye size={22} />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="organization" className="block text-sm font-medium text-white mb-1">
                  Organization
                </label>
                <input
                  id="organization"
                  type="text"
                  autoComplete='on'
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 
                            border border-gray-700 bg-black text-white placeholder-gray-400 
                            focus:outline-none focus:border-orange-500 transition-colors pr-12"
                  required
                />
              </div>

              <div>
                <label htmlFor="department" className="block text-sm font-medium text-white mb-1">
                  Department
                </label>
                <input
                  id="department"
                  type="text"
                  value={department}
                  autoComplete='on'
                  onChange={(e) => setDepartment(e.target.value)}
                  className="appearance-none rounded-lg relative block w-full px-4 py-3 
                            border border-gray-700 bg-black text-white placeholder-gray-400 
                            focus:outline-none focus:border-orange-500 transition-colors pr-12"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-white mb-1">
                Role
              </label>
              <select
                id="role"
                value={role}
                autoComplete='on'
                onChange={(e) => setRole(e.target.value)}
                className="appearance-none rounded-lg relative block w-full px-4 py-3 
                            border border-gray-700 bg-black text-white placeholder-gray-400 
                            focus:outline-none focus:border-orange-500 transition-colors pr-12"
              >
                <option value="student">Student</option>
                <option value="researcher">Researcher</option>
                <option value="faculty">Faculty</option>
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200" 
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate("/login")}
              className="font-medium text-orange-500 hover:text-orange-400 transition-colors"
            >
              Already have an account? Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignUp;