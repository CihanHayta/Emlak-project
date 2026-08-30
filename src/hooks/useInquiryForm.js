import { useState } from "react";
import { addLead } from "../lib/leadStore";
import { formatPhoneInput } from "../lib/formatPhoneInput";
import { isValidTrPhone } from "../lib/isValidTrPhone";

const EMPTY_FORM = { name: "", phone: "", message: "" };

/**
 * Shared state + handlers for the site's several "Ad Soyad / Telefon /
 * Mesaj" lead-capture forms (service request popup, contact page, listing
 * inquiry form).
 *
 * On submit, the lead is sent to the backend (see lib/leadStore.js) so it
 * shows up in the admin panel's Başvurular inbox for any device/tenant
 * member, not just whoever's browser submitted it. `context` should say
 * which form this was (e.g. "Ücretsiz Ekspertiz talebi", "İletişim formu",
 * or a listing's title) so the agency knows what a lead is asking about.
 */
export function useInquiryForm(context) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: name === "phone" ? formatPhoneInput(value) : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    // HTML'in `required` özelliği sadece "boş değil" der — "0555" gibi
    // eksik bir numarayı da geçerli sayar, tarayıcıya göre de tutarsız
    // davranabilir. Backend zaten reddediyordu ama kullanıcı bunu net bir
    // hata olarak görmüyordu; artık ağ isteğine hiç çıkmadan burada
    // yakalanıp anında, açık bir mesajla gösteriliyor.
    if (!form.name.trim()) {
      setError("Lütfen boşlukları doğru şekilde doldurunuz — Ad Soyad alanı boş bırakılamaz.");
      return;
    }
    if (!isValidTrPhone(form.phone)) {
      setError("Lütfen boşlukları doğru şekilde doldurunuz — telefon numaranızı eksiksiz girin (örn. 0539 941 71 05).");
      return;
    }

    setIsSubmitting(true);
    try {
      await addLead({ ...form, context });
      setIsSubmitted(true);
    } catch (err) {
      setError(err.message || "Talebiniz gönderilemedi, lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function reset() {
    setForm(EMPTY_FORM);
    setIsSubmitted(false);
    setError("");
  }

  return { form, isSubmitted, isSubmitting, error, handleChange, handleSubmit, reset };
}
