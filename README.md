# Alex Furniture storefront

A responsive React/Next storefront for Alex Furniture with:

- Living Room, Dining, and Bedroom hover menus
- multi-category product tagging (one item can appear under Bedroom, Beds, King, and Queen)
- search, category filtering, and a shopping cart
- local-delivery messaging for addresses within 120 miles of Chino, California
- Montclair and Riverside store information
- Instagram, Facebook, and TikTok links
- a simple catalog manager at `/admin`
- individual product add/edit/delete tools
- CSV product import and a downloadable CSV template
- a persistent product catalog backed by D1 when hosted
- a self-hosted JSON catalog and password-protected manager for an older Mac

## Downloaded project and 2017 MacBook hosting

See [MACBOOK_HOSTING.md](MACBOOK_HOSTING.md) for the complete setup, automatic
startup, backup, and Cloudflare Tunnel instructions. The Mac version stores its
catalog in `.data/products.json` and protects `/admin` with `ADMIN_PASSWORD`.

## Run the storefront locally

Requirements: Node.js 22.13 or newer and npm.

```bash
npm install
npm run dev
```

Open the local URL printed in the terminal. The storefront uses sample products
when a local product database is not configured.

To check the production build:

```bash
npm run build
```

## Catalog manager

Open `/admin` from the same local URL.

The easiest way to add a few products is the form. For a large catalog:

1. Select **Download template**.
2. Open the CSV in Excel or Google Sheets.
3. Add one product per row.
4. Separate multiple categories or sizes with `|`.
5. Save as CSV and select **Choose CSV**.

Example category value for a set sold in both king and queen:

```text
Bedroom|Bedroom Sets|Beds|King|Queen
```

Recommended CSV columns:

| Column | Example | Notes |
| --- | --- | --- |
| `id` | `AF-BR-100` | Keep the same id to update an existing product. May be blank for a new product. |
| `sku` | `B214-31` | Manufacturer or store SKU. |
| `name` | `Solana Bedroom Set` | Required. |
| `description` | `Includes bed, dresser, and mirror` | Plain text. |
| `price` | `1299` | Required retail price in dollars. |
| `compare_at_price` | `1499` | Optional original price. |
| `categories` | `Bedroom|Beds|King|Queen` | Use `|` between tags. |
| `sizes` | `King|Queen` | Optional. |
| `image_url` | `https://.../photo.jpg` | Use an image URL you are licensed to publish. |
| `badge` | `New` | Optional short label. |
| `vendor` | `Manufacturer name` | Optional. |
| `status` | `active` | Use `active` or `draft`. |
| `featured` | `true` | `true` or `false`. |

## Admin access before a public launch

Catalog write actions are allowed in local development. Hosted write access is
restricted to email addresses in the `ADMIN_EMAILS` environment variable. Use
a comma-separated list for more than one manager:

```text
alex@example.com,mom@example.com
```

Configure this hosted value before making the storefront public. The public
catalog can be viewed without admin access; adding, editing, importing, and
deleting products remain protected.

## Manufacturer catalogs

Do not scrape a manufacturer's public website or copy its images without
permission. Ask each manufacturer for its authorized dealer portal, product
feed, PIM/API access, image license, current inventory feed, and MAP/pricing
rules. Import the approved feed into the CSV format above or connect its API to
the product endpoint.

A robust automated importer should retain the manufacturer's SKU and calculate
retail pricing from a rule such as cost markup, margin target, MAP floor, or a
tiered rule. It should also log the source cost and last synchronization time so
price changes can be reviewed.

## Before accepting online payments

This first version intentionally calls the store to complete an order. Before
turning on card payments, add:

- a payment provider such as Stripe, Square, or Shopify Checkout
- exact road-distance verification from Chino for the delivery address
- delivery-zone fees and unavailable ZIP codes
- tax calculation
- inventory reservations and order notifications
- shipping, cancellation, return, privacy, and terms pages

Never collect or store card numbers directly in this app; use the hosted fields
or checkout page supplied by the payment provider.
