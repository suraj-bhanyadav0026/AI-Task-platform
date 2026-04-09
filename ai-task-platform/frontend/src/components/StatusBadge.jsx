// === FILE: frontend/src/components/StatusBadge.jsx ===
const StatusBadge = ({ status }) => {
  const styles = {
    pending: { bg: 'rgba(245, 158, 11, 0.2)', color: 'var(--warning)', label: 'Pending' },
    running: { bg: 'rgba(124, 58, 237, 0.2)', color: 'var(--accent-primary)', label: 'Running', className: 'pulse' },
    success: { bg: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', label: 'Success' },
    failed: { bg: 'rgba(239, 68, 68, 0.2)', color: 'var(--error)', label: 'Failed' },
  };

  const current = styles[status] || styles.pending;

  return (
    <span 
      className={current.className || ''}
      style={{
        background: current.bg,
        color: current.color,
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.375rem'
      }}
    >
      {status === 'running' && (
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
      )}
      {current.label}
    </span>
  );
};

export default StatusBadge;
