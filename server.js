const http = require("node:http");
const { createReadStream, existsSync, readFileSync } = require("node:fs");
const path = require("node:path");

const PORT = Number(process.env.PORT || 5500);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_DIR = __dirname;
const CONFIG_PATH = path.join(__dirname, "config.json");

const config = loadConfig();
const downloadCache = new Map();
let quotaCooldownUntil = 0;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return {};

  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function sendText(res, status, message) {
  res.writeHead(status, {
    "Content-Type": "text/plain; charset=utf-8"
  });
  res.end(message);
}

function sendJavaScript(res, status, message) {
  res.writeHead(status, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(message);
}

function isSafeStaticPath(filePath) {
  const relative = path.relative(PUBLIC_DIR, filePath);
  return relative && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) {
      throw new Error("Request body too large");
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function parseInstagramUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    return null;
  }

  const isInstagram = /(^|\.)instagram\.com$/i.test(url.hostname);
  if (!isInstagram) return null;

  const cleanPath = url.pathname.replace(/\/+$/, "");
  const parts = cleanPath.split("/").filter(Boolean);
  const contentType = parts[0] || "post";
  const shortcode = parts[1] || "";

  return {
    cleanUrl: `https://www.instagram.com${cleanPath}/`,
    contentType,
    shortcode
  };
}

function getProviderConfig() {
  return {
    name: "primary",
    url: process.env.IG_PROVIDER_URL || process.env.PROVIDER_URL || config.providerUrl,
    apiKey:
      process.env.IG_PROVIDER_KEY ||
      process.env.RAPIDAPI_KEY ||
      process.env.X_RAPIDAPI_KEY ||
      process.env.PROVIDER_KEY ||
      config.providerKey,
    host: process.env.IG_PROVIDER_HOST || process.env.RAPIDAPI_HOST || process.env.PROVIDER_HOST || config.providerHost,
    method: process.env.IG_PROVIDER_METHOD || process.env.PROVIDER_METHOD || config.providerMethod || "POST",
    requestStyle: process.env.IG_PROVIDER_REQUEST_STYLE || process.env.PROVIDER_REQUEST_STYLE || config.requestStyle || "jsonBody",
    urlParam: process.env.IG_PROVIDER_URL_PARAM || process.env.PROVIDER_URL_PARAM || config.urlParam || "url"
  };
}

function getBackupProviderConfig(index) {
  const prefix = `IG_PROVIDER_${index}_`;
  const primary = getProviderConfig();
  const defaults = index === 2
    ? {
        url: "https://instagram-reels-downloader2.p.rapidapi.com/.netlify/functions/api/getLink",
        host: "instagram-reels-downloader2.p.rapidapi.com"
      }
    : {};

  return {
    name: `backup-${index}`,
    url: process.env[`${prefix}URL`] || defaults.url,
    apiKey: process.env[`${prefix}KEY`] || primary.apiKey,
    host: process.env[`${prefix}HOST`] || defaults.host,
    method: process.env[`${prefix}METHOD`] || "GET",
    requestStyle: process.env[`${prefix}REQUEST_STYLE`] || "query",
    urlParam: process.env[`${prefix}URL_PARAM`] || "url"
  };
}

function getProviderConfigs() {
  return [
    getProviderConfig(),
    getBackupProviderConfig(2),
    getBackupProviderConfig(3)
  ].filter((provider) => provider.url && provider.host && provider.apiKey);
}

function maskSecret(value) {
  if (!value) return "";
  const text = String(value);
  if (text.length <= 12) return "***";
  return `${text.slice(0, 6)}...${text.slice(-6)}`;
}

function handleHealth(req, res) {
  const providers = getProviderConfigs();
  const provider = providers[0] || getProviderConfig();
  sendJson(res, 200, {
    ok: true,
    app: "ReelAGP",
    providerConfigured: providers.length > 0,
    providerCount: providers.length,
    providerUrl: provider.url || "",
    providerHost: provider.host || "",
    providerKey: maskSecret(provider.apiKey),
    providerMethod: provider.method,
    requestStyle: provider.requestStyle,
    urlParam: provider.urlParam
  });
}

function getAdConfig() {
  return {
    client:
      process.env.ADSENSE_CLIENT ||
      process.env.GOOGLE_ADSENSE_CLIENT ||
      config.adsenseClient ||
      "ca-pub-3466103859143604",
    publisher:
      process.env.ADSENSE_PUBLISHER_ID ||
      process.env.GOOGLE_ADSENSE_PUBLISHER_ID ||
      config.adsensePublisherId ||
      "pub-3466103859143604",
    slots: {
      "top-banner": {
        format: "auto",
        slot: process.env.ADSENSE_SLOT_TOP || config.adsenseSlots?.top || "1111111111"
      },
      "after-download": {
        format: "auto",
        slot: process.env.ADSENSE_SLOT_AFTER_DOWNLOAD || config.adsenseSlots?.afterDownload || "2222222222"
      },
      "before-faq": {
        format: "auto",
        slot: process.env.ADSENSE_SLOT_BEFORE_FAQ || config.adsenseSlots?.beforeFaq || "3333333333"
      },
      "bottom-mobile": {
        format: "auto",
        slot: process.env.ADSENSE_SLOT_BOTTOM || config.adsenseSlots?.bottom || "4444444444"
      }
    }
  };
}

function handleAdConfig(req, res) {
  const adConfig = getAdConfig();
  const contactEmail = process.env.CONTACT_EMAIL || config.contactEmail || "contact@reelagp.onrender.com";
  sendJavaScript(
    res,
    200,
    `window.REELAGP_ADSENSE_CLIENT=${JSON.stringify(adConfig.client)};\nwindow.REELAGP_AD_UNITS=${JSON.stringify(adConfig.slots)};\nwindow.REELAGP_CONTACT_EMAIL=${JSON.stringify(contactEmail)};\n`
  );
}

function handleAdsTxt(req, res) {
  const adConfig = getAdConfig();
  const publisher = adConfig.publisher || String(adConfig.client).replace(/^ca-/, "");

  if (!/^pub-\d{10,}$/.test(publisher)) {
    sendText(res, 200, "# Add ADSENSE_PUBLISHER_ID=pub-0000000000000000 in your hosting environment.\n");
    return;
  }

  sendText(res, 200, `google.com, ${publisher}, DIRECT, f08c47fec0942fa0\n`);
}

async function requestProvider(provider, { parsed, requestedType, quality }) {
  const headers = {
    "Content-Type": "application/json"
  };

  if (provider.apiKey) {
    headers.Authorization = `Bearer ${provider.apiKey}`;
    headers["x-api-key"] = provider.apiKey;
    headers["x-rapidapi-key"] = provider.apiKey;
  }

  if (provider.host) {
    headers["x-rapidapi-host"] = provider.host;
  }

  const payload = {
      url: parsed.cleanUrl,
      type: requestedType,
      quality
  };
  const method = String(provider.method).toUpperCase();
  const targetUrl = new URL(provider.url.replace("{url}", encodeURIComponent(parsed.cleanUrl)));
  const options = { method, headers };

  if (method === "GET" || provider.requestStyle === "query") {
    targetUrl.searchParams.set(provider.urlParam, parsed.cleanUrl);
    targetUrl.searchParams.set("type", requestedType);
    targetUrl.searchParams.set("quality", quality);
  } else {
    options.body = JSON.stringify(payload);
  }

  const providerResponse = await fetch(targetUrl, options);

  const data = await providerResponse.json().catch(() => ({}));
  if (!providerResponse.ok) {
    const message = data.error || data.message || "Provider request failed";
    const error = new Error(message);
    error.providerName = provider.name;
    error.statusCode = providerResponse.status;
    throw error;
  }

  const downloadUrl = pickDownloadUrl(data, parsed.cleanUrl, quality);

  if (!downloadUrl) {
    throw new Error("Provider ne download URL return nahi kiya.");
  }

  return {
    ok: true,
    mode: "real",
    title: data.title || data.data?.title || `${requestedType} download ready`,
    meta: data.meta || `${String(quality).toUpperCase()} file ready hai.`,
    sourceUrl: parsed.cleanUrl,
    downloadUrl: `/api/file?url=${encodeURIComponent(downloadUrl)}&name=${encodeURIComponent(`instasave-${requestedType}-${quality}.mp4`)}`,
    directUrl: downloadUrl,
    fileName: data.fileName || `instasave-${requestedType}-${quality}.mp4`
  };
}

async function resolveWithProvider({ parsed, requestedType, quality }) {
  const cacheKey = `${parsed.cleanUrl}|${requestedType}|${quality}`;
  const cached = downloadCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (quotaCooldownUntil > Date.now()) {
    throw new Error("Free monthly API quota abhi khatam hai. Kuch time baad try karein ya Free backup option use karein.");
  }

  const providers = getProviderConfigs();
  if (!providers.length) return null;

  const errors = [];
  for (const provider of providers) {
    try {
      const result = await requestProvider(provider, { parsed, requestedType, quality });
      downloadCache.set(cacheKey, {
        value: result,
        expiresAt: Date.now() + 60 * 60 * 1000
      });
      return result;
    } catch (error) {
      errors.push(error.message || "Provider request failed");
    }
  }

  const quotaError = errors.find((message) => /quota|monthly|limit|exceeded/i.test(message));
  if (quotaError) {
    quotaCooldownUntil = Date.now() + 30 * 60 * 1000;
    throw new Error("Free monthly API quota khatam ho gaya hai. Free backup option use karein ya quota reset hone ka wait karein.");
  }

  throw new Error(errors[errors.length - 1] || "Provider request failed");
}

function pickDownloadUrl(data, sourceUrl, quality) {
  if (typeof data === "string" && /^https?:\/\//i.test(data)) {
    return data;
  }

  const mediaLists = [
    data.medias,
    data.media,
    data.data?.medias,
    data.data?.media,
    data.result?.medias,
    data.result?.media,
    data.links
  ].filter(Boolean);

  const medias = mediaLists.flatMap((item) => Array.isArray(item) ? item : [item]);
  const preferredType = quality === "audio" ? "audio" : "video";
  const preferred = medias.find((item) => {
    const type = String(item.type || item.mimeType || "").toLowerCase();
    return item.url && type.includes(preferredType);
  });
  const fallbackMedia = medias.find((item) => item.url || item.downloadUrl);
  const candidate =
    preferred?.url ||
    preferred?.downloadUrl ||
    fallbackMedia?.url ||
    fallbackMedia?.downloadUrl ||
    data.downloadUrl ||
    data.url ||
    data.link ||
    data.downloadLink ||
    data.mediaUrl ||
    data.videoUrl ||
    data.video ||
    data.video_url ||
    data.download_url ||
    data.download_link ||
    data.data?.url ||
    data.data?.link ||
    data.data?.downloadLink ||
    data.data?.downloadUrl ||
    data.data?.mediaUrl ||
    data.data?.videoUrl ||
    data.data?.video ||
    data.data?.video_url ||
    data.data?.download_link ||
    data.result?.url ||
    data.result?.link ||
    data.result?.downloadLink ||
    data.result?.downloadUrl;

  if (!candidate || candidate === sourceUrl || /(^|\.)instagram\.com\//i.test(candidate)) {
    return null;
  }

  return candidate;
}

function isAllowedMediaUrl(value) {
  let url;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  const host = url.hostname.toLowerCase();
  return (
    host.endsWith(".fbcdn.net") ||
    host.endsWith(".cdninstagram.com") ||
    host.endsWith(".instagram.com")
  );
}

async function handleFileProxy(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const mediaUrl = requestUrl.searchParams.get("url");
  const fileName = requestUrl.searchParams.get("name") || "instasave-download.mp4";

  if (!mediaUrl || !isAllowedMediaUrl(mediaUrl)) {
    sendText(res, 400, "Invalid media URL");
    return;
  }

  if (req.method === "HEAD") {
    res.writeHead(200, {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${fileName.replace(/[^a-z0-9._-]/gi, "_")}"`,
      "Cache-Control": "no-store"
    });
    res.end();
    return;
  }

  try {
    const mediaResponse = await fetch(mediaUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        Referer: "https://www.instagram.com/"
      }
    });

    if (!mediaResponse.ok || !mediaResponse.body) {
      sendText(res, 502, "Media download failed");
      return;
    }

    res.writeHead(200, {
      "Content-Type": mediaResponse.headers.get("content-type") || "video/mp4",
      "Content-Disposition": `attachment; filename="${fileName.replace(/[^a-z0-9._-]/gi, "_")}"`,
      "Cache-Control": "no-store"
    });

    const reader = mediaResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    res.end();
  } catch {
    sendText(res, 502, "Media download failed");
  }
}

async function handleDownload(req, res) {
  try {
    const body = await readJsonBody(req);
    const parsed = parseInstagramUrl(body.url);

    if (!parsed) {
      sendJson(res, 400, {
        ok: false,
        error: "Valid public Instagram URL bhejein."
      });
      return;
    }

    if (!["reel", "story", "post"].includes(body.type)) {
      sendJson(res, 400, {
        ok: false,
        error: "Download type reel, story, ya post hona chahiye."
      });
      return;
    }

    if (!["hd", "sd", "audio"].includes(body.quality)) {
      sendJson(res, 400, {
        ok: false,
        error: "Quality hd, sd, ya audio honi chahiye."
      });
      return;
    }

    const resolved = await resolveWithProvider({
      parsed,
      requestedType: body.type,
      quality: body.quality
    });

    if (!resolved) {
      sendJson(res, 501, {
        ok: false,
        code: "PROVIDER_NOT_CONFIGURED",
        error: "Real Instagram downloader API abhi configure nahi hai. config.json me providerUrl/providerKey add karein."
      });
      return;
    }

    sendJson(res, 200, resolved);
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error.message || "Request process nahi ho payi."
    });
  }
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(requestUrl.pathname);
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const filePath = path.resolve(PUBLIC_DIR, relativePath);

  if (!isSafeStaticPath(filePath) || !existsSync(filePath)) {
    sendJson(res, 404, { ok: false, error: "File not found" });
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  res.writeHead(200, {
    "Content-Type": mimeTypes[extension] || "application/octet-stream"
  });
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/api/download") {
    await handleDownload(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/api/health") {
    handleHealth(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/ad-config.js") {
    handleAdConfig(req, res);
    return;
  }

  if (req.method === "GET" && req.url === "/ads.txt") {
    handleAdsTxt(req, res);
    return;
  }

  if ((req.method === "GET" || req.method === "HEAD") && req.url.startsWith("/api/file")) {
    await handleFileProxy(req, res);
    return;
  }

  if (req.method === "GET" || req.method === "HEAD") {
    await serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { ok: false, error: "Method not allowed" });
});

server.listen(PORT, HOST, () => {
  console.log(`InstaSave Hub running at http://${HOST}:${PORT}/`);
});
