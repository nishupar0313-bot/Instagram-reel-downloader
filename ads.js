const ADSENSE_CLIENT = window.REELAGP_ADSENSE_CLIENT || "ca-pub-XXXXXXXXXXXXXXXX";

const AD_UNITS = window.REELAGP_AD_UNITS || {
  "top-banner": {
    format: "auto",
    slot: "1111111111"
  },
  "after-download": {
    format: "auto",
    slot: "2222222222"
  },
  "before-faq": {
    format: "auto",
    slot: "3333333333"
  },
  "bottom-mobile": {
    format: "auto",
    slot: "4444444444"
  }
};

function hasRealAdSenseClient() {
  return /^ca-pub-\d{10,}$/.test(ADSENSE_CLIENT);
}

function hasRealAdSlot(slot) {
  return /^\d{10,}$/.test(String(slot)) && !/^([1-4])\1{9}$/.test(String(slot));
}

function loadAdSense() {
  if (document.querySelector(`script[src*="adsbygoogle.js?client=${ADSENSE_CLIENT}"]`)) return;

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
  document.head.append(script);
}

function renderAd(slotElement) {
  const unit = AD_UNITS[slotElement.dataset.adSlot];
  if (!unit || !hasRealAdSenseClient() || !hasRealAdSlot(unit.slot)) return;

  slotElement.textContent = "";
  const ad = document.createElement("ins");
  ad.className = "adsbygoogle";
  ad.style.display = "block";
  ad.dataset.adClient = ADSENSE_CLIENT;
  ad.dataset.adSlot = unit.slot;
  ad.dataset.adFormat = unit.format;
  ad.dataset.fullWidthResponsive = "true";
  slotElement.append(ad);
  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.push({});
}

document.addEventListener("DOMContentLoaded", () => {
  if (hasRealAdSenseClient()) {
    loadAdSense();
  }

  document.querySelectorAll("[data-ad-slot]").forEach(renderAd);
});
