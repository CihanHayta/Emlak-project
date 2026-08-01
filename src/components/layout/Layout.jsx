import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import WhatsAppButton from "../common/WhatsAppButton";
import "./Layout.css";

/**
 * Shared page shell rendered by every route (see App.jsx).
 * `<Outlet />` is where react-router injects whichever page component
 * matches the current URL (Home, Satılık, Kiralık, ...).
 */
export default function Layout() {
  return (
    <div className="layout">
      <Header />
      <main className="layout__main">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
