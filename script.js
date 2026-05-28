const form = document.querySelector("#downloadForm");
const input = document.querySelector("#instagramUrl");
const statusText = document.querySelector("#statusText");
const resultCard = document.querySelector("#resultCard");
const resultTitle = document.querySelector("#resultTitle");
const resultMeta = document.querySelector("#resultMeta");
const previewType = document.querySelector("#previewType");
const downloadLink = document.querySelector("#downloadLink");
const backupLink = document.querySelector("#backupLink");
const resetButton = document.querySelector("#resetButton");
const pasteButton = document.querySelector("#pasteButton");
const tabs = [...document.querySelectorAll(".mode-tab")];

let selectedMode = "reel";
let lastSubmittedUrl = "";

const modeLabels = {
  reel: "Reel",
  story: "Story",
  post: "Post"
};

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle("error", isError);
}

function isInstagramUrl(value) {
  try {
    const url = new URL(value);
    return /(^|\.)instagram\.com$/i.test(url.hostname);
  } catch {
    return false;
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    selectedMode = tab.dataset.mode;
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-pressed", String(active));
    });
    input.placeholder = `https://www.instagram.com/${selectedMode}/...`;
    setStatus(`${modeLabels[selectedMode]} ka public link paste karein.`);
  });
});

pasteButton.addEventListener("click", async () => {
  if (!navigator.clipboard) {
    setStatus("Clipboard browser me available nahi hai.", true);
    return;
  }

  try {
    input.value = await navigator.clipboard.readText();
    input.focus();
    setStatus("Link pasted. Ab Fetch media dabao.");
  } catch {
    setStatus("Clipboard permission allow karni hogi.", true);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const url = input.value.trim();
  const quality = new FormData(form).get("quality");
  lastSubmittedUrl = url;

  if (!isInstagramUrl(url)) {
    setStatus("Valid Instagram link paste karo, example: https://www.instagram.com/reel/...", true);
    input.focus();
    return;
  }

    setStatus("Media fetch ho raha hai...");

  try {
    const response = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, type: selectedMode, quality })
    });

    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "API unavailable");

    showResult({
      title: data.title || `${modeLabels[selectedMode]} download ready`,
      meta: data.meta || `${quality.toUpperCase()} file prepared from public media.`,
      href: data.downloadUrl || "#",
      fallbackUrl: ""
    });
    setStatus(data.mode === "demo" ? "Backend connected. Demo media response received." : "Media ready. Save MP4 dabayein.");
  } catch (error) {
    showResult({
      title: `${modeLabels[selectedMode]} download not ready`,
      meta: error.message || `Real ${quality.toUpperCase()} download ke liye backend API configure karein.`,
      href: "#",
      fallbackUrl: "https://sssig.pro/"
    });
    setStatus(error.message || "Real download ke liye backend API connect karein.", true);
  }
});

backupLink.addEventListener("click", async () => {
  const url = lastSubmittedUrl || input.value.trim();
  if (!url || !navigator.clipboard) return;

  try {
    await navigator.clipboard.writeText(url);
    setStatus("Instagram link copied. Free backup page me paste karke Download dabayein.");
  } catch {
    setStatus("Free backup page open hoga. Instagram link manually paste karein.");
  }
});

resetButton.addEventListener("click", () => {
  input.value = "";
  resultCard.classList.add("hidden");
  backupLink.classList.add("hidden");
  setStatus("Naya Instagram link paste karein.");
  input.focus();
});

function showResult({ title, meta, href, fallbackUrl }) {
  previewType.textContent = selectedMode.toUpperCase();
  resultTitle.textContent = title;
  resultMeta.textContent = meta;
  downloadLink.href = href;
  const hasDownload = href && href !== "#";
  downloadLink.toggleAttribute("download", hasDownload);
  downloadLink.classList.toggle("disabled", !hasDownload);
  downloadLink.setAttribute("aria-disabled", String(!hasDownload));
  backupLink.href = fallbackUrl || "#";
  backupLink.classList.toggle("hidden", !fallbackUrl);
  resultCard.classList.remove("hidden");
  resultCard.scrollIntoView({ behavior: "smooth", block: "center" });
}
