import { useEffect } from "react";
import { X } from "lucide-react";
import "./Modal.css";

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
    <div className="modal__overlay" onClick={onClose} role="presentation">
      <div
        className="modal__card"
        // Stop clicks inside the card from bubbling up and closing the modal.
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button type="button" onClick={onClose} aria-label="Kapat" className="modal__close">
          <X className="icon-5" />
        </button>

        {title && <h3 className="modal__title">{title}</h3>}

        {children}
      </div>
    </div>
  );
}
