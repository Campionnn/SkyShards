# SkyShards

[🌐 Live App](https://skyshards.com/)

SkyShards is a website for the Hypixel Skyblock attribute fusion system.

## Features
- Calculate the fastest/cheapest way to fuse attributes
- Automatic adjustment of fusion tree based on custom rates and current bazaar prices
- Clean and responsive design

## Getting Started
To run locally:
Pull the latest changes

```sh
pnpm install
pnpm run dev
```

## Self-hosting with Docker
The image serves the site with nginx (same routing and redirects as the live site).

### Docker-Image
A ready-made image is published on every update:
```sh
docker run -d -p 8080:80 --name skyshards --restart unless-stopped ghcr.io/campionnn/skyshards:latest
```

Or as a `docker-compose.yml`:
```yaml
services:
  skyshards:
    image: ghcr.io/campionnn/skyshards:latest
    ports:
      - "8080:80"
    restart: unless-stopped
```

To update: `docker pull ghcr.io/campionnn/skyshards:latest` and recreate the container (or `docker compose pull && docker compose up -d`).

### Build it yourself
Pull the latest changes
```sh
git clone https://github.com/campionnn/SkyShards.git
cd SkyShards
```
With Docker Compose
```sh
docker compose up -d --build
```

Or with plain Docker:
```sh
docker build -t skyshards .
docker run -d -p 8080:80 --name skyshards --restart unless-stopped skyshards
```

The site is then available at http://localhost:8080. Set `PORT` to use a different host port with Compose (e.g. `PORT=3000 docker compose up -d --build`).

The inventory scan works out of the box: the container proxies `/api` to the SkyShards backend (`https://api.skyshards.com`), so the browser never makes a cross-origin request. To use a different backend, set `API_UPSTREAM` (no rebuild needed):
```sh
docker run -d -p 8080:80 -e API_UPSTREAM=https://api.example.com skyshards
```

To update, pull the latest changes and run the build command again.

## Contributing
Contributions are welcome! Feel free to open issues or submit pull requests.