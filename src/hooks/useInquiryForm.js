import { useState } from "react";
import { addLead } from "../lib/leadStore";

const EMPTY_FORM = { name: "", phone: "", message: "" };

/**
 * Shared state + handlers for the site's several "Ad Soyad / Telefon /
 * Mesaj" lead-capture forms (service request popup, contact page, listing
 * inquiry form).
 *
 * On submit, the lead is written to the shared lead store (see
 * lib/leadStore.js) so it immediately shows up in the admin panel's
 * Müşteriler ("Gelen Formlar") inbox — no backend needed since the public
 * site and admin panel are the same app. `context` should say which form
 * this was (e.g. "Ücretsiz Ekspertiz talebi", "İletişim formu", or a
 * listing's title) so the agency knows what a lead is asking about.
 */
export function useInquiryForm(context) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitted, setIsSubmitted] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    addLead({ ...form, context });
    setIsSubmitted(true);
  }

  function reset() {
    setForm(EMPTY_FORM);
    setIsSubmitted(false);
  }

  return { form, isSubmitted, handleChange, handleSubmit, reset };
}
