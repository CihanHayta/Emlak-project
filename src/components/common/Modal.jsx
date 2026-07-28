import { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Generic popup/dialog shell: dark overlay + centered white card.
 *
 * This component only knows how to open/close/close-on-escape/close-on-
 * overlay-click — it renders whatever is passed as `children`, so it can be
 * reused for the service request form, or any future popup.
 */
export default function Modal({ isOpen, onClose, title, children }) {
  // Close on "Escape" key while the modal is open.
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    // Prevent the page behind the modal from scrolling while it's open.
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 px-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        // Stop clicks inside the card from bubbling up and closing the modal.
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        {title && (
          <h3 className="mb-4 pr-8 text-xl font-bold text-brand-navy">{title}</h3>
        )}

        {children}
      </div>
    </div>
  );
}
