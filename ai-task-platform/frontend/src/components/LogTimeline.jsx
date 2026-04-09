// === FILE: frontend/src/components/LogTimeline.jsx ===
const LogTimeline = ({ logs = [] }) => {
  return (
    <div className="card" style={{ background: '#09090b', height: '100%', minHeight: '400px' }}>
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#e4e4e7', fontSize: '1rem' }}>
        <span className="mono" style={{ color: 'var(--accent-primary)' }}>&gt;_</span> Terminal
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontFamily: '"Space Mono", monospace', fontSize: '0.75rem' }}>
        {logs.length === 0 && <p style={{ color: '#71717a' }}>Waiting for logs...</p>}
        
        {logs.map((log, index) => {
          let color = '#a1a1aa'; // default INFO
          if (log.level === 'ERROR') color = '#ef4444';
          if (log.level === 'WARN') color = '#f59e0b';

          return (
            <div key={index} style={{ borderLeft: `2px solid ${color}`, paddingLeft: '0.75rem', position: 'relative' }}>
               <div style={{ 
                 position: 'absolute', left: '-5px', top: '2px', width: '8px', height: '8px', 
                 borderRadius: '50%', background: color 
               }} />
               <div style={{ color: '#71717a', marginBottom: '0.25rem' }}>
                 {new Date(log.timestamp).toLocaleTimeString()}
               </div>
               <div style={{ color: '#e4e4e7', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                 {log.message}
               </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LogTimeline;
