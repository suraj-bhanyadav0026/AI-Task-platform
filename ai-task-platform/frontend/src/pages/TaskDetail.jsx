// === FILE: frontend/src/pages/TaskDetail.jsx ===
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import StatusBadge from '../components/StatusBadge';
import LogTimeline from '../components/LogTimeline';
import { ArrowLeft, Activity } from 'lucide-react';

const TaskDetail = () => {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let pollInterval = null;
    
    const fetchInitial = async () => {
      try {
        const res = await api.get(`/tasks/${id}`);
        setTask(res.data.task);

        if (res.data.task.status === 'pending' || res.data.task.status === 'running') {
          setupPolling();
        }
      } catch (err) {
        toast.error('Failed to load task details');
      } finally {
        setLoading(false);
      }
    };

    const setupPolling = () => {
      pollInterval = setInterval(async () => {
        try {
          const res = await api.get(`/tasks/${id}`);
          setTask(res.data.task);
          
          if (res.data.task.status === 'success' || res.data.task.status === 'failed') {
            clearInterval(pollInterval);
          }
        } catch(e) {
          console.error('Poll error', e);
        }
      }, 3000);
    };

    fetchInitial();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [id]);

  if (loading || !task) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}><Activity className="pulse" color="var(--accent-primary)" size={32} /></div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem', color: 'var(--text-secondary)' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Main Info */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{task.title}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>ID: <span className="mono">{task._id}</span></p>
              </div>
              <StatusBadge status={task.status} />
            </div>

            <div style={{ display: 'flex', gap: '2rem', padding: '1rem', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
               <div>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>OPERATION</p>
                 <p className="mono">{task.operation}</p>
               </div>
               <div>
                 <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>CREATED AT</p>
                 <p className="mono">{new Date(task.createdAt).toLocaleString()}</p>
               </div>
               {task.workerPid && (
                 <div>
                   <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>WORKER PID</p>
                   <p className="mono">{task.workerPid}</p>
                 </div>
               )}
            </div>
          </div>

          {/* Input & Output */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
               Input
            </h3>
            <pre style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
              {task.input}
            </pre>
          </div>

          {(task.status === 'success' || task.status === 'failed') && (
            <div className="card" style={{ border: `1px solid ${task.status === 'success' ? 'var(--success)' : 'var(--error)'}` }}>
              <h3 style={{ marginBottom: '1rem', color: task.status === 'success' ? 'var(--success)' : 'var(--error)' }}>
                {task.status === 'success' ? 'Result' : 'Error'}
              </h3>
              <pre style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                {typeof task.result === 'object' ? JSON.stringify(task.result, null, 2) : task.result}
              </pre>
            </div>
          )}
        </div>

        {/* Sidebar Logs */}
        <div>
           <LogTimeline logs={task.logs || []} />
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
