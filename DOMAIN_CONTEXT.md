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

---

## 2. Option A: Namecheap DNS Configuration for Vercel Deployment

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

## 3. Option B: Firebase App Hosting Deployment (`victorcme`)

Your Firebase Project is configured:
- **Project Name**: `victorc`
- **Project ID**: `victorcme`
- **Config Files**: [`apphosting.yaml`](file:///Volumes/MacSSD/victorc.me/apphosting.yaml) and [`firebase.json`](file:///Volumes/MacSSD/victorc.me/firebase.json)

### Step-by-Step Setup via Firebase Console:
1. Open the **[Firebase Console](https://console.firebase.google.com/project/victorcme/overview)**.
2. In the left navigation, click **Build > App Hosting**.
3. Click **Get Started**:
   - Link your GitHub account (`Another1nat`).
   - Select repository: **`Another1nat/victorc.me`**.
   - Target branch: **`main`**.
4. In App Hosting Settings > **Domains**:
   - Add your custom domain: **`victorc.me`**.
   - Firebase will provide the specific Google Cloud IP addresses or CNAME to add to Namecheap.
5. **Setting up your Gemini API Key Secret**:
   - In Google Cloud Console for project `victorcme`, open **Secret Manager**.
   - Add secret named `geminiApiKey` with your Google AI Studio API key.
   - Grant the App Hosting Cloud Run service account access to read this secret.
   - Now, your `/api/ai` route and `/demo` page will execute live queries on Gemini 2.0 Flash at $0 cost within the generous free quotas!

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
