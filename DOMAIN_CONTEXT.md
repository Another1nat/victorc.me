# Domain & Deployment Context: `victorc.me`

This document contains full context and step-by-step instructions for connecting and managing your domain **`victorc.me`** (registered on Namecheap), setting up free email forwarding, and deploying to Vercel with automatic SSL.

---

## 1. Domain Overview

- **Domain**: `victorc.me`
- **Registrar**: Namecheap
- **Target Platform**: Vercel (Recommended for Next.js App Router) or Cloudflare Pages
- **GitHub Repository**: `https://github.com/Another1nat/victorc.me`
- **Canonical Email**: `victor@victorc.me`

---

## 2. Namecheap DNS Configuration for Vercel Deployment

When deploying your Next.js site to **Vercel** (which is 100% free for personal sites and provides automatic edge caching and free SSL):

### Step-by-Step Setup:
1. Log in to your **Namecheap Dashboard**.
2. Go to **Domain List** > Find `victorc.me` > Click **Manage**.
3. Under the **Nameservers** section:
   - Ensure it is set to **Namecheap BasicDNS** (or **Namecheap Web Hosting DNS**).
4. Click on the **Advanced DNS** tab at the top.
5. In the **Host Records** section, add the following two records:

| Type | Host | Value / Target | TTL | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **A Record** | `@` | `76.76.21.21` | Automatic | Points apex (`victorc.me`) to Vercel Edge Network |
| **CNAME Record** | `www` | `cname.vercel-dns.com.` | Automatic | Points `www.victorc.me` to Vercel |

6. Click **Save all changes**.
7. In your **Vercel Dashboard**:
   - Go to your Project > **Settings** > **Domains**.
   - Enter `victorc.me` and choose to redirect `www.victorc.me` to `victorc.me` (or vice versa).
   - Vercel will automatically verify the DNS records and issue a free Let's Encrypt SSL certificate within a few minutes.

---

## 3. Free Email Forwarding Setup (`victor@victorc.me`)

You do **not** need to pay for Google Workspace or Microsoft 365 to receive emails at `victor@victorc.me`. Namecheap includes **Free Email Forwarding**:

1. In Namecheap, under **Domain List** > `victorc.me` > **Manage**.
2. Scroll down to the **Redirect Email** section.
3. Click **Add Forwarder**:
   - **Alias**: `victor` (or `contact`)
   - **Forward to**: `<your-personal-email@gmail.com>`
4. Click the checkmark to save.
5. Now, whenever someone uses the contact form on `victorc.me` or emails `victor@victorc.me`, it will automatically land in your personal inbox!

---

## 4. Social Metadata & OpenGraph Standards

All canonical links on the website are configured to use `https://victorc.me`:
- **Research Essays**: `https://victorc.me/research/[slug]`
- **Journal Notes**: `https://victorc.me/notes/[slug]`
- **Contact**: `https://victorc.me/contact`
- **RSS Feed**: `https://victorc.me/feed.xml`

When sharing any essay on LinkedIn or X (Twitter), the platform automatically crawls the page metadata and generates an editorial preview card with the title, summary, and site name.

---

## 5. Automated LinkedIn Syndication

- **GitHub Action Workflow**: `.github/workflows/linkedin-autopost.yml`
- Whenever you push new articles to `main`, GitHub Actions runs `scripts/post-to-linkedin.mjs` to syndicate the post to LinkedIn automatically.
