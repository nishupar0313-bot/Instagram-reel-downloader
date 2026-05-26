# Real Instagram Download Setup

The website and backend are running, but real downloads need an approved media resolver/API.

## Setup

1. Copy `config.example.json` to `config.json`.
2. Add your provider endpoint in `providerUrl`.
3. Add RapidAPI host in `providerHost` if your provider uses RapidAPI.
4. Add your API key in `providerKey`.
5. Set `providerMethod` to `GET` or `POST`.
6. Set `requestStyle` to `query` if the provider expects `?url=...`; keep `jsonBody` if it expects JSON.
7. Restart the server window.

Expected provider response can be any of these shapes:

```json
{
  "downloadUrl": "https://example.com/file.mp4",
  "title": "Instagram reel",
  "fileName": "reel.mp4"
}
```

The backend also accepts `url`, `mediaUrl`, `media.url`, `result.downloadUrl`, or `links[0].url`.

Only use this for public content you own or have permission to download.
