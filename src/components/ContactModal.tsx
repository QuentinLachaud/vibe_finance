import { useEffect, useRef, useState } from 'react';

interface ContactModalProps {
  onClose: () => void;
}

export function ContactModal({ onClose }: ContactModalProps) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messageRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

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
      <div className="login-modal contact-modal" role="dialog" aria-modal="true" aria-labelledby="contact-modal-title" onClick={(e) => e.stopPropagation()}>
        {sent ? (
          <div className="contact-modal__sent">
            <div className="contact-modal__sent-icon">✉️</div>
            <h2 id="contact-modal-title" className="contact-modal__title">Message sent!</h2>
            <p className="contact-modal__copy">
              Thanks for reaching out. I'll get back to you as soon as I can.
            </p>
            <button
              className="settings-btn settings-btn--primary contact-modal__action"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h2 id="contact-modal-title" className="contact-modal__title contact-modal__title--centered">
              Contact the Developer
            </h2>
            <p className="contact-modal__copy contact-modal__copy--centered">
              Got feedback, a bug report, or a feature idea? I'd love to hear from you.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="contact-modal__field">
                <label
                  htmlFor="contact-email"
                  className="contact-modal__label"
                >
                  Your email <span className="contact-modal__optional">(optional)</span>
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

              <div className="contact-modal__field contact-modal__field--message">
                <label
                  htmlFor="contact-message"
                  className="contact-modal__label"
                >
                  Your message
                </label>
                <textarea
                  ref={messageRef}
                  id="contact-message"
                  placeholder="What's on your mind?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                  className="contact-modal__message"
                />
              </div>

              {error && (
                <p className="contact-modal__error">
                  {error}
                </p>
              )}

              <div className="contact-modal__actions">
                <button
                  type="button"
                  className="settings-btn settings-btn--secondary contact-modal__action"
                  onClick={onClose}
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="settings-btn settings-btn--primary contact-modal__action"
                  disabled={sending || !message.trim()}
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
