"use client";

import { useEffect } from "react";
import Clarity from "@microsoft/clarity";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { CLARITY_KEY, GA_ID } from "@/lib/config";

export function ClarityInit() {
  useEffect(() => {
    if (CLARITY_KEY) Clarity.init(CLARITY_KEY);
  }, []);
  return null;
}

export function GtagInit() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("config", GA_ID, { page_path: pathname });
    }
  }, [pathname]);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { page_path: window.location.pathname });
          `,
        }}
      />
    </>
  );
}
