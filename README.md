# ReelAGP

ReelAGP is a public Instagram reel downloader built with a static frontend and a lightweight Node.js backend.

## Run Locally

1. Create `config.json` from `config.example.json`.
2. Add your RapidAPI details.
3. Start the server:

```bash
npm start
```

Open:

```txt
http://127.0.0.1:5500/
```

## Environment Variables

For hosting, do not upload `config.json`. Set these variables in your hosting dashboard:

```txt
IG_PROVIDER_URL=https://instagram-reels-downloader-api.p.rapidapi.com/download
IG_PROVIDER_HOST=instagram-reels-downloader-api.p.rapidapi.com
IG_PROVIDER_KEY=your_rapidapi_key
IG_PROVIDER_METHOD=GET
IG_PROVIDER_REQUEST_STYLE=query
IG_PROVIDER_URL_PARAM=url
```

Optional backup providers can be added with the same shape. The app tries them in order when the main provider fails:

```txt
IG_PROVIDER_2_URL=https://another-provider.p.rapidapi.com/download
IG_PROVIDER_2_HOST=another-provider.p.rapidapi.com
IG_PROVIDER_2_KEY=your_backup_key
IG_PROVIDER_2_METHOD=GET
IG_PROVIDER_2_REQUEST_STYLE=query
IG_PROVIDER_2_URL_PARAM=url
```

## Ads And Monetization

The site now includes ad placements on the homepage, legal pages for ad network review, and dynamic `/ads.txt` support.

The current AdSense client is already set to:

```txt
ADSENSE_CLIENT=ca-pub-3466103859143604
ADSENSE_PUBLISHER_ID=pub-3466103859143604
```

After your AdSense account creates display ad units, add these Render environment variables:

```txt
ADSENSE_SLOT_TOP=your_top_ad_unit_slot
ADSENSE_SLOT_AFTER_DOWNLOAD=your_after_download_ad_unit_slot
ADSENSE_SLOT_BEFORE_FAQ=your_before_faq_ad_unit_slot
ADSENSE_SLOT_BOTTOM=your_mobile_bottom_ad_unit_slot
```

Until real slot IDs are added, the page shows clean ad placeholders and can still use AdSense Auto Ads.

## Render Deploy

1. Upload this project to GitHub.
2. Create a new Render **Web Service**.
3. Connect your GitHub repository.
4. Use these settings:

```txt
Runtime: Node
Build Command: npm install
Start Command: npm start
```

5. Add the environment variables listed above.
6. Deploy.

## Important

Only use this for public content you own or have permission to download. Keep API keys private.
