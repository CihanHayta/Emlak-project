import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Home from "./pages/Home";
import Satilik from "./pages/Satilik";
import Kiralik from "./pages/Kiralik";
import Hakkimizda from "./pages/Hakkimizda";
import Hizmetlerimiz from "./pages/Hizmetlerimiz";
import Iletisim from "./pages/Iletisim";
import PropertyDetail from "./pages/PropertyDetail";
import NotFound from "./pages/NotFound";

import RequireAuth from "./admin/components/RequireAuth";
import AdminLayout from "./admin/layouts/AdminLayout";
import Login from "./admin/pages/Login";
import Dashboard from "./admin/pages/Dashboard";
import Listings from "./admin/pages/Listings";
import ListingForm from "./admin/pages/ListingForm";
import Appointments from "./admin/pages/Appointments";
import Customers from "./admin/pages/Customers";
import Basvurular from "./admin/pages/Basvurular";
import Notifications from "./admin/pages/Notifications";
import Settings from "./admin/pages/Settings";
import PlaceholderPage from "./admin/pages/PlaceholderPage";

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
          <Route path="ilan/:id" element={<PropertyDetail />} />
        </Route>

        {/* Admin panel */}
        <Route path="admin/login" element={<Login />} />
        <Route path="admin" element={<RequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="ilanlar" element={<Listings />} />
            <Route path="ilanlar/yeni" element={<ListingForm />} />
            <Route path="ilanlar/:id" element={<ListingForm />} />
            <Route path="basvurular" element={<Basvurular />} />
            <Route path="randevular" element={<Appointments />} />
            <Route path="musteriler" element={<Customers />} />
            <Route path="mesajlar" element={<PlaceholderPage title="Mesajlar" />} />
            <Route path="bildirimler" element={<Notifications />} />
            <Route path="ayarlar" element={<Settings />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
