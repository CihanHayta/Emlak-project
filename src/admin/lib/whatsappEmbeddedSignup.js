/**
 * WhatsApp "Embedded Signup" — Instagram'daki gibi tam sayfa yönlendirme
 * DEĞİL, Meta'nın Facebook JavaScript SDK'sı üzerinden açılan bir POPUP
 * akışı. İki ayrı bilgi kaynağı var:
 * 1. `FB.login()`'in callback'i → `code` (backend'e gönderilip token'a
 *    çevrilecek).
 * 2. Popup'ın kendi `window.postMessage`'ı → `{ type: "WA_EMBEDDED_SIGNUP",
 *    data: { waba_id, phone_number_id } }` (Meta bunu popup içinden gönderir,
 *    `code`'un içinde bu bilgiler YOK).
 *
 * `VITE_WHATSAPP_APP_ID`/`VITE_WHATSAPP_CONFIG_ID`: Meta Business Settings'te
 * oluşturulacak bir "WhatsApp Embedded Signup" konfigürasyonundan gelir —
 * henüz oluşturulmadıysa bu akış çalışmaz, `Settings.jsx` bunu kullanıcıya
 * açıkça söyler (bkz. `isEmbeddedSignupConfigured`).
 */
const FB_SDK_URL = "https://connect.facebook.net/en_US/sdk.js";
const APP_ID = import.meta.env.VITE_WHATSAPP_APP_ID;
const CONFIG_ID = import.meta.env.VITE_WHATSAPP_CONFIG_ID;

export const isEmbeddedSignupConfigured = Boolean(APP_ID && CONFIG_ID);

let sdkLoadPromise = null;

function loadFacebookSdk() {
  if (sdkLoadPromise) return sdkLoadPromise;

  sdkLoadPromise = new Promise((resolve, reject) => {
    if (window.FB) {
      resolve(window.FB);
      return;
    }
    window.fbAsyncInit = function fbAsyncInit() {
      window.FB.init({ appId: APP_ID, version: "v21.0", xfbml: false });
      resolve(window.FB);
    };
    const script = document.createElement("script");
    script.src = FB_SDK_URL;
    script.async = true;
    script.defer = true;
    script.onerror = () => reject(new Error("Facebook SDK yüklenemedi."));
    document.body.appendChild(script);
  });

  return sdkLoadPromise;
}

/**
 * Popup'ı açar, hem `code`'u hem `waba_id`/`phone_number_id`'yi toplayıp tek
 * bir sonuç olarak döner. İkisi de gelmeden çözülmez (biri eksikse akış
 * yarım kalmış demektir, çağıran taraf hata olarak ele almalı).
 */
export function startWhatsappEmbeddedSignup() {
  if (!isEmbeddedSignupConfigured) {
    return Promise.reject(new Error("WhatsApp Embedded Signup henüz yapılandırılmamış (VITE_WHATSAPP_APP_ID/CONFIG_ID eksik)."));
  }

  return new Promise((resolve, reject) => {
    let signupData = null;
    let authCode = null;

    function finishIfReady() {
      if (signupData && authCode) {
        window.removeEventListener("message", onMessage);
        resolve({ code: authCode, wabaId: signupData.waba_id, phoneNumberId: signupData.phone_number_id });
      }
    }

    function onMessage(event) {
      if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.type === "WA_EMBEDDED_SIGNUP" && parsed.event === "FINANCE_APP_INFO" && parsed.data) {
          signupData = { waba_id: parsed.data.waba_id, phone_number_id: parsed.data.phone_number_id };
          finishIfReady();
        }
      } catch {
        // Facebook SDK'nın popup'tan gönderdiği ilgisiz mesajlar JSON olmayabilir — sessizce yok say.
      }
    }
    window.addEventListener("message", onMessage);

    loadFacebookSdk()
      .then((FB) => {
        FB.login(
          (response) => {
            if (response.authResponse?.code) {
              authCode = response.authResponse.code;
              finishIfReady();
            } else {
              window.removeEventListener("message", onMessage);
              reject(new Error("WhatsApp bağlantısı iptal edildi veya izin verilmedi."));
            }
          },
          {
            config_id: CONFIG_ID,
            response_type: "code",
            override_default_response_type: true,
            extras: { setup: {}, featureType: "", sessionInfoVersion: "3" },
          },
        );
      })
      .catch((error) => {
        window.removeEventListener("message", onMessage);
        reject(error);
      });
  });
}
