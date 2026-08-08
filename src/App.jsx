import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import Satilik from "./pages/Satilik";
import Kiralik from "./pages/Kiralik";
import Hakkimizda from "./pages/Hakkimizda";
import Hizmetlerimiz from "./pages/Hizmetlerimiz";
import Iletisim from "./pages/Iletisim";
import Gizlilik from "./pages/Gizlilik";
import PropertyDetail from "./pages/PropertyDetail";
import Araclar from "./pages/Araclar";
import VehicleDetail from "./pages/VehicleDetail";
import FunnelPage from "./pages/FunnelPage";
import NotFound from "./pages/NotFound";

// Admin paneli (Firebase Auth SDK + tüm CRM sayfaları/bileşenleri) BİLEREK
// lazy-load ediliyor — genel site ziyaretçisi (ilana bakan, form dolduran
// müşteri adayı) bu kodu hiç indirmemeli. Öncesinde tek pakette birleşince
// bundle ~1MB'a (288KB gzip) çıkıyordu; `npm run build`'ın kendi uyarısıyla
// tespit edildi. Admin'e hiç girmeyen bir ziyaretçi artık bunun hiçbirini
// indirmez, sadece gerçekten /admin/* açıldığında ayrı bir parça (chunk)
// olarak çekilir.
const RequireAuth = lazy(() => import("./admin/components/RequireAuth"));
const AdminLayout = lazy(() => import("./admin/layouts/AdminLayout"));
const Login = lazy(() => import("./admin/pages/Login"));
const Dashboard = lazy(() => import("./admin/pages/Dashboard"));
const Listings = lazy(() => import("./admin/pages/Listings"));
const ListingForm = lazy(() => import("./admin/pages/ListingForm"));
const Vehicles = lazy(() => import("./admin/pages/Vehicles"));
const VehicleForm = lazy(() => import("./admin/pages/VehicleForm"));
const Appointments = lazy(() => import("./admin/pages/Appointments"));
const Customers = lazy(() => import("./admin/pages/Customers"));
const Basvurular = lazy(() => import("./admin/pages/Basvurular"));
const Mesajlar = lazy(() => import("./admin/pages/Mesajlar"));
const Notifications = lazy(() => import("./admin/pages/Notifications"));
const Settings = lazy(() => import("./admin/pages/Settings"));
const Funnels = lazy(() => import("./admin/pages/Funnels"));
const FunnelForm = lazy(() => import("./admin/pages/FunnelForm"));

function AdminLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-navy">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-gold border-t-transparent" />
    </div>
  );
}

/**
 * App-level route table: the public marketing site (under <Layout/>) and
 * the admin panel (under /admin/*, gated by RequireAuth + wrapped in
 * AdminLayout) are two separate route trees sharing one router.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public site */}
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="satilik" element={<Satilik />} />
          <Route path="kiralik" element={<Kiralik />} />
          <Route path="hakkimizda" element={<Hakkimizda />} />
          <Route path="hizmetlerimiz" element={<Hizmetlerimiz />} />
          <Route path="iletisim" element={<Iletisim />} />
          <Route path="gizlilik-politikasi" element={<Gizlilik />} />
          <Route path="ilan/:id" element={<PropertyDetail />} />
          <Route path="araclar" element={<Araclar />} />
          <Route path="arac/:id" element={<VehicleDetail />} />
        </Route>

        {/* Kampanya (funnel) sayfaları — BİLEREK <Layout/> DIŞINDA, genel
            site navigasyonu/footer'ı olmadan, reklam trafiğinin dikkati
            dağılmasın diye. Admin tarafı için bkz. admin/pages/Funnels.jsx. */}
        <Route path="kampanya/:slug" element={<FunnelPage />} />

        {/* Admin panel */}
        <Route
          path="admin/login"
          element={
            <Suspense fallback={<AdminLoadingFallback />}>
              <Login />
            </Suspense>
          }
        />
        <Route
          path="admin"
          element={
            <Suspense fallback={<AdminLoadingFallback />}>
              <RequireAuth />
            </Suspense>
          }
        >
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="ilanlar" element={<Listings />} />
            <Route path="ilanlar/yeni" element={<ListingForm />} />
            <Route path="ilanlar/:id" element={<ListingForm />} />
            <Route path="araclar" element={<Vehicles />} />
            <Route path="araclar/yeni" element={<VehicleForm />} />
            <Route path="araclar/:id" element={<VehicleForm />} />
            <Route path="basvurular" element={<Basvurular />} />
            <Route path="randevular" element={<Appointments />} />
            <Route path="musteriler" element={<Customers />} />
            <Route path="mesajlar" element={<Mesajlar />} />
            <Route path="bildirimler" element={<Notifications />} />
            <Route path="funnel" element={<Funnels />} />
            <Route path="funnel/:id" element={<FunnelForm />} />
            <Route path="ayarlar" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
