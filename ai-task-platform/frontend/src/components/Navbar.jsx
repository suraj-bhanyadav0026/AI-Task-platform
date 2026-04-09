// === FILE: frontend/src/components/Navbar.jsx ===
import { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LayoutDashboard, PlusSquare, LogOut, Activity } from 'lucide-react';

const Navbar = () => {
  const { logout, user } = useContext(AuthContext);

  return (
    <aside style={{
      width: '250px',
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 0'
    }}>
      <div style={{ padding: '0 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Activity color="var(--accent-primary)" size={28} />
        <h2 style={{ fontSize: '1.25rem', margin: 0 }}>AI Tasks</h2>
      </div>

      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0 1rem' }}>
        <NavLink 
          to="/dashboard" 
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
            borderRadius: '8px', color: isActive ? 'white' : 'var(--text-secondary)',
            background: isActive ? 'var(--accent-primary)' : 'transparent',
            fontWeight: 500, transition: 'all 0.2s'
          })}
        >
          <LayoutDashboard size={20} /> Dashboard
        </NavLink>
        
        <NavLink 
          to="/tasks/new" 
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
            borderRadius: '8px', color: isActive ? 'white' : 'var(--text-secondary)',
            background: isActive ? 'var(--accent-primary)' : 'transparent',
            fontWeight: 500, transition: 'all 0.2s'
          })}
        >
          <PlusSquare size={20} /> Create Task
        </NavLink>
      </nav>

      <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Logged in as</p>
          <p style={{ fontWeight: 600, color: 'white' }}>{user?.username}</p>
        </div>
        <button 
          onClick={logout}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--error)',
            width: '100%', padding: '0.75rem', borderRadius: '8px', fontWeight: 500
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <LogOut size={18} /> Logout
        </button>
      </div>
    </aside>
  );
};

export default Navbar;
