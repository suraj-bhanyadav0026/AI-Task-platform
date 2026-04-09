// === FILE: frontend/src/pages/CreateTask.jsx ===
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';

const operations = [
  { id: 'uppercase', icon: '🔠', title: 'Uppercase', desc: 'Convert all text to UPPERCASE' },
  { id: 'lowercase', icon: '🔡', title: 'Lowercase', desc: 'Convert all text to lowercase' },
  { id: 'reverse', icon: '🔄', title: 'Reverse', desc: 'Reverse string characters' },
  { id: 'word_count', icon: '🔢', title: 'Word Count', desc: 'Analyze text statistics' }
];

const CreateTask = () => {
  const [title, setTitle] = useState('');
  const [input, setInput] = useState('');
  const [operation, setOperation] = useState('uppercase');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post('/tasks', { title, input, operation });
      toast.success('Task created successfully!');
      navigate(`/tasks/${res.data.task._id}`);
    } catch (err) {
      if (err.response?.data?.errors) {
        toast.error(err.response.data.errors[0].msg);
      } else {
        toast.error(err.response?.data?.error || 'Failed to create task');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem' }}>Create New Task</h1>
      
      <form onSubmit={handleSubmit} className="card">
        <div style={{ marginBottom: '1.5rem' }}>
          <label>Task Title</label>
          <input 
            type="text" 
            className="input-field" 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Process document headers"
            required 
          />
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label>Operation</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
            {operations.map(op => (
              <div 
                key={op.id}
                onClick={() => setOperation(op.id)}
                style={{
                  border: `2px solid ${operation === op.id ? 'var(--accent-primary)' : 'var(--border)'}`,
                  background: operation === op.id ? 'rgba(124, 58, 237, 0.1)' : 'var(--bg-tertiary)',
                  borderRadius: '8px',
                  padding: '1rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex', flexDirection: 'column', gap: '0.5rem'
                }}
              >
                <div style={{ fontSize: '1.5rem' }}>{op.icon}</div>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>{op.title}</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', lineHeight: 1.4 }}>{op.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '2rem' }}>
          <label>Input Text</label>
          <textarea 
            className="input-field" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={6}
            placeholder="Paste your text here..."
            required 
            style={{ resize: 'vertical' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn-primary" disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Run Task'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTask;
