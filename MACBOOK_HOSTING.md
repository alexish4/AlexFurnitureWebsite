# Hosting Alex Furniture on a 2017 MacBook Pro

## Will the MacBook handle it?

Yes. A 2017 Intel i5 MacBook Pro with 8 GB of memory is sufficient for this
storefront, its catalog manager, and normal traffic for a small local furniture
business. Product images are loaded from their licensed external URLs, so the
Mac does not need to resize or serve large image libraries.

The limitations are availability rather than raw speed: the site goes offline
if the Mac sleeps, loses power or Internet, reboots before login, or develops a
hardware problem. Keep the Mac ventilated, connected to power and Ethernet when
possible, and keep a backup of `.data/products.json`.

This is suitable for a catalog and call-to-order storefront. Do not process or
store credit-card numbers directly on this Mac. Add a hosted payment provider
before accepting online payments.

## Part 1: Prepare the Mac

1. Update the Mac to the newest macOS release that Apple offers for it. A 2017
   MacBook Pro officially supports macOS Ventura.
2. Install the Intel macOS version of Node.js 22 LTS from
   <https://nodejs.org/en/download>.
3. Open Terminal and confirm the installation:

   ```bash
   node --version
   npm --version
   ```

4. Extract `alex-furniture-store.zip` into a permanent folder, for example
   `Documents/alex-furniture-store`. Do not run it from Downloads if you may
   later move or delete that folder.
5. In Terminal, enter the project folder. An easy method is to type `cd ` with
   a space and then drag the project folder into the Terminal window.

## Part 2: Set the catalog password

Run:

```bash
cp .env.production.local.example .env.production.local
nano .env.production.local
```

Replace the example password with a unique password of at least 16 characters.
Do not reuse an email, banking, Apple ID, or social-media password. In `nano`,
press Control+O, Return, and then Control+X to save and exit.

The password protects `/admin`. It is sent only over the HTTPS connection when
the public tunnel in Part 5 is used, and the browser remembers it only for the
current tab session.

## Part 3: Install and test

Run:

```bash
npm install
npm run build
npm run start:mac
```

Open <http://127.0.0.1:8787> on the Mac. Open
<http://127.0.0.1:8787/admin> to test the catalog password. The first start
creates `.data/products.json` with the sample catalog. Products added or edited
in the manager are saved to that file.

Stop the test server with Control+C.

## Part 4: Start it automatically

Run this once:

```bash
npm run install:mac-service
```

The website will start whenever this Mac user logs in and will restart if the
server process exits. Logs are kept in the project's `logs` folder.

To stop automatic startup without deleting the catalog:

```bash
npm run uninstall:mac-service
```

In System Settings, prevent automatic sleep while the Mac is connected to
power. Keep the lid open unless the Mac is connected to an external display in
a supported closed-display setup. Ethernet is preferable to Wi-Fi for a public
server.

## Part 5: Make it publicly reachable

Do not open or forward port 8787 on the router. Use a Cloudflare Tunnel so the
Mac remains behind the router and customers receive HTTPS.

The safest first hostname is something like `shop.alexfurnitureusa.com`; it will
not replace the current main website while you test.

1. Put the chosen domain's DNS under a Cloudflare account.
2. In the Cloudflare dashboard, go to **Networking → Tunnels** and create a
   remotely managed tunnel named `alex-furniture-mac`.
3. Choose macOS and run the installation command Cloudflare shows. It contains
   a secret tunnel token; do not save that token in this project or share it.
4. Add a public hostname such as `shop.alexfurnitureusa.com`.
5. Set its service type to **HTTP** and its URL to:

   ```text
   localhost:8787
   ```

6. Visit the HTTPS hostname from a phone with Wi-Fi turned off. Test the store,
   search, categories, and `/admin` sign-in.

Cloudflare documents Homebrew installation with `brew install cloudflared` and
running the connector as a macOS service. A remotely managed tunnel's dashboard
provides the complete service-install command.

## Backups and updates

Back up this file after catalog changes:

```text
.data/products.json
```

Time Machine can protect the entire project folder. Before a code update, make
an additional copy of the catalog file. After replacing code files, run:

```bash
npm install
npm run build
npm run install:mac-service
```

Check these URLs after every update:

```text
http://127.0.0.1:8787
http://127.0.0.1:8787/admin
```

## Troubleshooting

- **Website does not open locally:** run `npm run start:mac` in Terminal and
  read the visible error.
- **Admin password is rejected:** confirm `ADMIN_PASSWORD` exists in
  `.env.production.local`, contains at least 12 characters, and has no spaces
  around the equals sign.
- **Public URL is offline:** verify the local URL first, then check that the
  Cloudflare tunnel is healthy.
- **Changes disappeared:** restore `.data/products.json` from Time Machine or
  another backup.
- **Port 8787 is already in use:** change `PORT` in `.env.production.local` and
  update the Cloudflare service URL to the same port.
