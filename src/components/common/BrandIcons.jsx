/**
 * Hand-drawn SVG icons for brands that lucide-react does NOT ship (it only
 * provides generic/outline icons, not logo marks). Kept as plain inline SVG
 * so we don't need to pull in a whole extra icon library just for 5 logos.
 *
 * Every icon accepts a `className` so callers can size/color them with
 * Tailwind classes exactly like a lucide-react icon, e.g.
 * `<WhatsAppIcon className="h-5 w-5 text-white" />`.
 */

export function WhatsAppIcon({ className }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.01 3C9.38 3 4 8.38 4 15.01c0 2.2.6 4.34 1.73 6.22L3 29l7.94-2.68a12.9 12.9 0 0 0 5.07 1.03h.01c6.63 0 12.01-5.38 12.01-12.01C28.03 8.7 22.65 3.32 16.02 3zm0 21.98h-.01a10 10 0 0 1-5.09-1.39l-.36-.22-4.72 1.59 1.6-4.6-.24-.37a9.94 9.94 0 0 1-1.53-5.29c0-5.52 4.5-10.02 10.03-10.02 2.68 0 5.2 1.05 7.09 2.95a9.94 9.94 0 0 1 2.94 7.09c0 5.53-4.5 10.03-10.03 10.03zm5.5-7.51c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.96 1.18-.18.2-.35.22-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.79-1.68-2.09-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.94-2.24-.25-.6-.5-.5-.68-.51h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.02-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.13 3.25 5.16 4.56.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.73 2.03-1.43.25-.7.25-1.3.17-1.43-.07-.12-.27-.2-.57-.35z" />
    </svg>
  );
}

export function FacebookIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14C17.17 2.1 15.9 2 14.56 2 11.73 2 9.75 3.66 9.75 6.7V9.5H6.5v4h3.25V22h4.25v-8.5z" />
    </svg>
  );
}

export function InstagramIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function YoutubeIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12c0-2.4-.2-3.7-.5-4.4-.4-.9-1.1-1.6-2-2C18 5 12 5 12 5s-6 0-7.5.6c-.9.4-1.6 1.1-2 2C2.2 8.3 2 9.6 2 12s.2 3.7.5 4.4c.4.9 1.1 1.6 2 2C6 19 12 19 12 19s6 0 7.5-.6c.9-.4 1.6-1.1 2-2 .3-.7.5-2 .5-4.4zM10 15.5v-7l6 3.5-6 3.5z" />
    </svg>
  );
}

export function LinkedinIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M6.94 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM3.2 8.75h3.5V21H3.2V8.75zm6.2 0h3.35v1.68h.05c.47-.88 1.6-1.8 3.3-1.8 3.53 0 4.18 2.28 4.18 5.25V21h-3.5v-6.4c0-1.53-.03-3.5-2.13-3.5-2.14 0-2.47 1.65-2.47 3.38V21H9.4V8.75z" />
    </svg>
  );
}
