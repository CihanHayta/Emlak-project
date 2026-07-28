import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import WhatsAppButton from "../common/WhatsAppButton";

/**
 * Shared page shell rendered by every route (see App.jsx).
 * `<Outlet />` is where react-router injects whichever page component
 * matches the current URL (Home, Satılık, Kiralık, ...).
 */
export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
