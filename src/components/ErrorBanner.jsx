import { C, RADIUS } from '../constants.js';

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      className="font-sans mb-8 px-4 py-3"
      style={{ fontSize: 13.5, color: C.critical, background: 'transparent', border: `1.5px solid ${C.critical}`, borderRadius: RADIUS.medium, fontWeight: 500 }}
      role="alert"
    >
      {message}
    </div>
  );
}
