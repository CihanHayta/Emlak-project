import { CheckCircle2, Send } from "lucide-react";
import Modal from "./Modal";
import { useInquiryForm } from "../../hooks/useInquiryForm";

/**
 * Popup form opened when a visitor clicks one of the 4 service cards
 * (Ücretsiz Ekspertiz / Kredi Danışmanlığı / Tapu Takip Süreci / 7/24 Destek).
 *
 * There is no backend yet, so submitting just shows a "thank you, we
 * received your request" confirmation state instead of actually sending
 * the data anywhere (see useInquiryForm). Wire up a real API call there
 * once one exists (e.g. an admin-panel endpoint or an email service).
 *
 * `serviceTitle` is shown inside the form so the visitor (and later, the
 * agency) knows which service the request is about.
 */
export default function ServiceRequestModal({ isOpen, onClose, serviceTitle }) {
  const { form, isSubmitted, handleChange, handleSubmit, reset } = useInquiryForm(serviceTitle);

  // Reset internal state a moment after the modal fully closes, so the next
  // time it opens it starts fresh instead of showing the previous result.
  function handleClose() {
    onClose();
    setTimeout(reset, 300);
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={!isSubmitted ? serviceTitle : undefined}>
      {isSubmitted ? (
        <div className="flex flex-col items-center py-4 text-center">
          <CheckCircle2 className="mb-4 h-14 w-14 text-emerald-500" />
          <h3 className="mb-2 text-xl font-bold text-brand-navy">Teşekkür ederiz!</h3>
          <p className="text-gray-600">
            Bilgileriniz ve talepleriniz alındı, en kısa zamanda size ulaşacağız.
            Bizi tercih ettiğiniz için teşekkür ederiz.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-6 w-full rounded-lg bg-brand-navy px-4 py-2.5 font-semibold text-white transition hover:bg-brand-navy-light"
          >
            Kapat
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="-mt-2 text-sm text-gray-500">
            Bilgilerinizi bırakın, “{serviceTitle}” talebiniz için en kısa sürede
            size dönüş yapalım.
          </p>

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
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
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-gray-700">
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
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
            />
          </div>

          <div>
            <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700">
              Mesajınız
            </label>
            <textarea
              id="message"
              name="message"
              rows={3}
              value={form.message}
              onChange={handleChange}
              placeholder="Eklemek istediğiniz bir not var mı?"
              className="w-full resize-none rounded-lg border border-gray-300 px-3.5 py-2.5 outline-none transition focus:border-brand-gold focus:ring-2 focus:ring-brand-gold/30"
            />
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-gold px-4 py-2.5 font-semibold text-white transition hover:bg-brand-gold-dark"
          >
            <Send className="h-4 w-4" />
            Talebi Gönder
          </button>
        </form>
      )}
    </Modal>
  );
}
