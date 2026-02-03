import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ProjectView from './pages/ProjectView';
import SearchPage from './pages/SearchPage';
import { AuthProvider } from './contexts/AuthContext';
import SignUp from './components/auth/Signup';
import Login from './components/auth/LogIn';
import Logout from './components/auth/LogOut';
import ProtectedRoute from './components/auth/ProtectedRoutes';
import Home from './pages/Home';
import Profile from "./pages/Profile";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Home />}/>
          <Route path='/login' element={<Login />}/>
          <Route path='/register' element={<SignUp />}/>
          <Route path='/profile/:email' element={<Profile />}/>

          <Route path='/logout' element={
            <ProtectedRoute>
              <Logout />
            </ProtectedRoute>
          }/>

          <Route path='/dashboard' element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          <Route path='/search' element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          } />

          <Route path='/projects/:projectId' element={
            <ProtectedRoute>
              <ProjectView />
            </ProtectedRoute>
          } />

          <Route path='/search' element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          } />

          <Route path='/projects/:projectId' element={
            <ProtectedRoute>
              <ProjectView />
            </ProtectedRoute>
          } />

          <Route path='/search' element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
export default App;