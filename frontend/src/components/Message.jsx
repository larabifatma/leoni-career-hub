/**
 * Bandeau de message réutilisable.
 * @param {string} type - 'erreur' | 'succes' | 'info'
 */
const ICONES = { erreur: '⚠', succes: '✓', info: 'ℹ' };

function Message({ type = 'info', children }) {
  if (!children) return null;

  return (
    <div className={`message message-${type}`}>
      <span>{ICONES[type]}</span>
      <span>{children}</span>
    </div>
  );
}

export default Message;
