[🌐 Live App](https://skyshards.com/) | [🔗 Alternative Link](https://skyshards-1jk.pages.dev/)

## Website Not Working? Fix DNS Issues

If skyshards.com isn't loading, your ISP likely cached the old GitHub IP address. When we switched to Cloudflare, your ISP is still sending you to the old server. Here's how to fix it:

### Step 1: Clear DNS Cache

**Windows:**

1. Press `Windows + R`
2. Type `cmd` and press Enter
3. Run: `ipconfig /flushdns`

**macOS:**

1. Press `Cmd + Space` to open Spotlight
2. Type `Terminal` and press Enter
3. Run: `sudo dscacheutil -flushcache && sudo killall -HUP mDNSResponder`
4. Enter your password when prompted

### Step 2: Change DNS to Google's Servers

**Windows:**

1. Go to Network Settings
2. Click on your current connection (Wi-Fi or Ethernet)
3. Click Properties
4. Select TCP/IPv4 > Properties
5. Use custom DNS:
   - Primary: `8.8.8.8`
   - Secondary: `8.8.4.4`

**macOS:**

1. Go to System Preferences > Network
2. Select your current connection (Wi-Fi or Ethernet)
3. Click Advanced > DNS
4. Click the `+` button and add:
   - `8.8.8.8`
   - `8.8.4.4`
5. Click OK, then Apply

### Alternative Solutions

- **Reset your router** (unplug for 30 seconds)
- **Use a VPN** to access the site
- **Wait 2 days** - DNS cache will refresh automatically

**Note:** Google's DNS (8.8.8.8) uses Google's cached IP rather than your ISP's outdated cache.
