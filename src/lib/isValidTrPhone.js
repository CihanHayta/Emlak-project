/**
 * Frontend karşılığı — server/src/utils/phone.js#isValidTrPhone ile AYNI
 * kural (10 haneli 5 ile başlayan, ya da 0 ile başlayan 11 hane, ya da 90
 * ile başlayan 12 hane). Public formlar (İletişim, hizmet talebi popup'ı,
 * ilan sorgu formu — bkz. hooks/useInquiryForm.js) eskiden HTML'in
 * `required` özelliğine güveniyordu — bu sadece "boş değil" der, "0555"
 * gibi eksik bir numarayı da geçerli sayar. Backend zaten reddediyordu
 * ama kullanıcı bunu bir hata mesajı olarak net görmüyordu; artık
 * gönderilmeden ÖNCE burada yakalanıp anında, açık bir hata gösteriliyor.
 */
export function isValidTrPhone(input) {
  if (!input) return false;
  const digits = String(input).replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) return true;
  if (digits.length === 11 && digits.startsWith("0")) return true;
  if (digits.length === 12 && digits.startsWith("90")) return true;
  return false;
}
