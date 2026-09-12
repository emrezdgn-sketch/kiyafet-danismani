import { C, SHADOW } from '../constants.js';

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      className="font-sans mb-8 px-4 py-3 rounded-2xl"
      style={{ fontSize: 13.5, color: C.danger, background: C.bg, boxShadow: SHADOW.inset, fontWeight: 500 }}
      role="alert"
    >
      {message}
    </div>
  );
}
