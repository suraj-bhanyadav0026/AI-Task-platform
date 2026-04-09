// === FILE: frontend/src/pages/Dashboard.jsx ===
import { useState, useEffect } from 'react';
import api from '../utils/api';
import TaskCard from '../components/TaskCard';
import toast from 'react-hot-toast';
import { Activity } from 'lucide-react';

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, prefix_counts: {} });

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.tasks);
      
      // Calculate derived stats
      const total = res.data.total;
      const success = res.data.tasks.filter(t => t.status === 'success').length;
      const failed = res.data.tasks.filter(t => t.status === 'failed').length;
      const pending = res.data.tasks.filter(t => t.status === 'pending' || t.status === 'running').length;
      setStats({ total, success, failed, pending });
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(tasks.filter(t => t._id !== id));
      toast.success('Task deleted');
    } catch (err) {
      toast.error('Failed to delete task');
    }
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Activity className="pulse" color="var(--accent-primary)" size={32} /></div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem' }}>Dashboard</h1>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
        {[
          { label: 'Total Tasks', value: stats.total, color: 'var(--accent-primary)' },
          { label: 'Success', value: stats.success || 0, color: 'var(--success)' },
          { label: 'Failed', value: stats.failed || 0, color: 'var(--error)' },
          { label: 'In Progress', value: stats.pending || 0, color: 'var(--warning)' },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ borderLeft: `4px solid ${stat.color}` }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{stat.label}</p>
            <p className="mono" style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Mini Chart Analytics Tool (BONUS 2) */}
      {tasks.length > 0 && (
        <div className="card" style={{ marginBottom: '3rem' }}>
           <h3 style={{ marginBottom: '1rem' }}>Success Ratio</h3>
           <div style={{ height: '8px', display: 'flex', borderRadius: '4px', overflow: 'hidden' }}>
             <div style={{ width: `${(stats.success / stats.total) * 100 || 0}%`, background: 'var(--success)' }} />
             <div style={{ width: `${(stats.failed / stats.total) * 100 || 0}%`, background: 'var(--error)' }} />
             <div style={{ width: `${(stats.pending / stats.total) * 100 || 0}%`, background: 'var(--warning)' }} />
           </div>
           <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.875rem' }}>
             <span style={{ color: 'var(--success)' }}>■ Success</span>
             <span style={{ color: 'var(--error)' }}>■ Failed</span>
             <span style={{ color: 'var(--warning)' }}>■ Pending</span>
           </div>
        </div>
      )}

      {/* Task List */}
      <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Recent Tasks</h2>
      {tasks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No tasks found. Create one to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {tasks.map(task => (
            <TaskCard key={task._id} task={task} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
