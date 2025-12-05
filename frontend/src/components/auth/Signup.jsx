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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-2xl p-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-slate-900 mb-3"> 
              MemoryFlow
            </h1>
            <p className="text-slate-600 text-lg">
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
              <label htmlFor="email" className="block text-base font-medium text-slate-700 mb-2"> 
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete='on'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                required
              />
            </div>

            <div>
              <label htmlFor="fullName" className="block text-base font-medium text-slate-700 mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                autoComplete='on'
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-5 py-3 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> 
              <div>
                <label htmlFor="password" className="block text-base font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete='on'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-5 py-3 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
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
                <label htmlFor="confirmPassword" autoComplete="on" className="block text-base font-medium text-slate-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    autoComplete='on'
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-5 py-3 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
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
                <label htmlFor="organization" className="block text-base font-medium text-slate-700 mb-2">
                  Organization
                </label>
                <input
                  id="organization"
                  type="text"
                  autoComplete='on'
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full px-5 py-3 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="department" className="block text-base font-medium text-slate-700 mb-2">
                  Department
                </label>
                <input
                  id="department"
                  type="text"
                  value={department}
                  autoComplete='on'
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-5 py-3 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="block text-base font-medium text-slate-700 mb-2">
                Role
              </label>
              <select
                id="role"
                value={role}
                autoComplete='on'
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-5 py-3 text-base border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg" 
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate("/login")}
              className="text-base text-blue-600 hover:text-blue-700 font-medium"
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