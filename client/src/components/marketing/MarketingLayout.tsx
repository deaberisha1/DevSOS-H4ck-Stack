import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import shared from "../../styles/marketing.module.css";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

export default function MarketingLayout() {
  const { pathname } = useLocation();

  // A new page starts at the top, and the heading is what gets read out.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <div className={shared.page}>
      <SiteHeader />
      <main id="main">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  );
}
