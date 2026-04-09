// === FILE: frontend/src/components/TaskCard.jsx ===
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import { Trash2 } from 'lucide-react';

const TaskCard = ({ task, onDelete }) => {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ marginBottom: '0.25rem', fontSize: '1.125rem' }}>{task.title}</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }} className="mono">
            {new Date(task.createdAt).toLocaleString()}
          </p>
        </div>
        <StatusBadge status={task.status} />
      </div>

      <div style={{ background: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.875rem' }}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>Operation</p>
        <p className="mono">{task.operation}</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
        <Link 
          to={`/tasks/${task._id}`} 
          className="btn-primary" 
          style={{ flex: 1, textAlign: 'center', textDecoration: 'none' }}
        >
          View Details
        </Link>
        <button 
          onClick={() => onDelete(task._id)}
          style={{ 
            background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', 
            padding: '0 1rem', borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          title="Delete Task"
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
};

export default TaskCard;
