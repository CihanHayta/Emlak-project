import { CheckCircle2, Send } from "lucide-react";
import Modal from "./Modal";
import { useInquiryForm } from "../../hooks/useInquiryForm";
import "./ServiceRequestModal.css";

/**
 * Popup form opened when a visitor clicks one of the 4 service cards
 * (Ücretsiz Ekspertiz / Kredi Danışmanlığı / Tapu Takip Süreci / 7/24 Destek).
 *
 * Submitting sends the request to the backend (see hooks/useInquiryForm.js)
 * and then shows a "thank you, we received your request" confirmation state.
 *
 * `serviceTitle` is shown inside the form so the visitor (and later, the
 * agency) knows which service the request is about.
 */
export default function ServiceRequestModal({ isOpen, onClose, serviceTitle }) {
  const { form, isSubmitted, isSubmitting, error, handleChange, handleSubmit, reset } = useInquiryForm(serviceTitle);

  // Reset internal state a moment after the modal fully closes, so the next
  // time it opens it starts fresh instead of showing the previous result.
  function handleClose() {
    onClose();
    setTimeout(reset, 300);
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={!isSubmitted ? serviceTitle : undefined}>
      {isSubmitted ? (
        <div className="service-request__thankyou">
          <CheckCircle2 className="service-request__thankyou-icon" />
          <h3 className="service-request__thankyou-title">Teşekkür ederiz!</h3>
          <p className="service-request__thankyou-text">
            Bilgileriniz ve talepleriniz alındı, en kısa zamanda size ulaşacağız.
            Bizi tercih ettiğiniz için teşekkür ederiz.
          </p>
          <button type="button" onClick={handleClose} className="service-request__thankyou-close">
            Kapat
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="service-request__form">
          <p className="service-request__intro">
            Bilgilerinizi bırakın, “{serviceTitle}” talebiniz için en kısa sürede
            size dönüş yapalım.
          </p>

          <div>
            <label htmlFor="name" className="service-request__field-label">
              Ad Soyad
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              value={form.name}
              onChange={handleChange}
              placeholder="Adınız Soyadınız"
              className="service-request__field-input"
            />
          </div>

          <div>
            <label htmlFor="phone" className="service-request__field-label">
              Telefon
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              value={form.phone}
              onChange={handleChange}
              placeholder="05XX XXX XX XX"
              className="service-request__field-input"
            />
          </div>

          <div>
            <label htmlFor="message" className="service-request__field-label">
              Mesajınız
            </label>
            <textarea
              id="message"
              name="message"
              rows={3}
              value={form.message}
              onChange={handleChange}
              placeholder="Eklemek istediğiniz bir not var mı?"
              className="service-request__field-input service-request__field-input--textarea"
            />
          </div>

          {error && <p className="service-request__error">{error}</p>}

          <button type="submit" className="service-request__submit" disabled={isSubmitting}>
            <Send className="icon-4" />
            {isSubmitting ? "Gönderiliyor..." : "Talebi Gönder"}
          </button>
        </form>
      )}
    </Modal>
  );
}
