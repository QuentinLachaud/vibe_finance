import { useState } from 'react';

interface ContactModalProps {
  onClose: () => void;
}

export function ContactModal({ onClose }: ContactModalProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);
    setError('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim() || undefined,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to send');
      }

      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="login-overlay" onClick={onClose}>
      <div className="login-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, textAlign: 'left' }}>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✉️</div>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: 8, fontSize: 20 }}>Message sent!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, lineHeight: 1.6 }}>
              Thanks for reaching out. I'll get back to you as soon as I can.
            </p>
            <button
              className="settings-btn settings-btn--primary"
              onClick={onClose}
              style={{ padding: '10px 24px', fontSize: 14 }}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ color: 'var(--text-primary)', marginBottom: 6, fontSize: 20, textAlign: 'center' }}>
              Contact the Developer
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24, textAlign: 'center', lineHeight: 1.5 }}>
              Got feedback, a bug report, or a feature idea? I'd love to hear from you.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label
                  htmlFor="contact-email"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}
                >
                  Your email <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(optional)</span>
                </label>
                <input
                  id="contact-email"
                  type="email"
                  className="login-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  style={{ marginBottom: 0 }}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label
                  htmlFor="contact-message"
                  style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}
                >
                  Your message
                </label>
                <textarea
                  id="contact-message"
                  placeholder="What's on your mind?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    lineHeight: 1.6,
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {error && (
                <p style={{ color: 'var(--color-danger, #ef4444)', fontSize: 13, marginBottom: 12 }}>
                  {error}
                </p>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="settings-btn settings-btn--secondary"
                  onClick={onClose}
                  disabled={sending}
                  style={{ padding: '10px 18px', fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="settings-btn settings-btn--primary"
                  disabled={sending || !message.trim()}
                  style={{ padding: '10px 18px', fontSize: 13 }}
                >
                  {sending ? 'Sending…' : 'Send my comments!'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
