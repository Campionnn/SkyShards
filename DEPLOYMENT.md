# SkyShards Deployment Guide

This guide provides multiple deployment options for the SkyShards Fusion Calculator.

## Quick Deploy Options

### 1. **Vercel** (Recommended - Easiest)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Or use the npm script
npm run deploy:vercel
```

**Pros:**
- Zero-config deployment
- Automatic HTTPS
- Global CDN
- Custom domains
- Instant rollbacks

**Steps:**
1. Visit [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import your repository
4. Deploy automatically

---

### 2. **Netlify**
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir dist

# Or use the npm script
npm run deploy:netlify
```

**Pros:**
- Drag & drop deployment
- Form handling
- Functions support
- Split testing

**Steps:**
1. Visit [netlify.com](https://netlify.com)
2. Drag & drop the `dist` folder after running `npm run build`
3. Or connect your Git repository

---

### 3. **Surge.sh** (Fastest for testing)
```bash
# Install Surge CLI
npm install -g surge

# Deploy
surge dist --domain skyshards-fusion-calculator.surge.sh

# Or use the npm script
npm run deploy:surge
```

**Pros:**
- Instant deployment
- Custom domains
- No signup required
- CLI-based

---

### 4. **Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

**Pros:**
- Full-stack hosting
- Database support
- Environment variables
- Custom domains

---

## Build & Deploy Process

### 1. **Build the project**
```bash
npm run build
```

### 2. **Test locally**
```bash
npm run preview
```

### 3. **Deploy to your chosen platform**
Choose any of the deployment methods above.

## Environment Variables

The app automatically detects the deployment environment:
- `NODE_ENV=production` - Production build
- `GITHUB_PAGES=true` - GitHub Pages specific build (sets base path)

## Files Added for Deployment

- `vercel.json` - Vercel configuration
- `netlify.toml` - Netlify configuration  
- `railway.json` - Railway configuration
- `CNAME` - Surge.sh domain configuration

## Troubleshooting

### Build Issues
```bash
# Clear cache and rebuild
rm -rf node_modules dist .vite
npm install
npm run build
```

### Deployment Issues
- Ensure all static assets are properly referenced
- Check that the build output is in the `dist` folder
- Verify environment variables are set correctly

## Custom Domain Setup

Most platforms support custom domains:
- **Vercel**: Project Settings → Domains
- **Netlify**: Site Settings → Domain Management
- **Surge**: Use `--domain yourdomain.com` flag
- **Railway**: Project Settings → Domains

## Performance Optimization

The build is already optimized with:
- Code splitting
- Tree shaking
- Minification
- Gzip compression (handled by hosting platforms)

## Security Headers

Add these headers in your hosting platform:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
```

## Monitoring

Consider adding:
- **Vercel**: Built-in analytics
- **Netlify**: Analytics add-on
- **Google Analytics**: For detailed tracking
- **Sentry**: For error tracking
