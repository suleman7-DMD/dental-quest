# Free Stuff Guide for Sully (The Idiot-Proof Version)

> No VC. No pitching. No business plans. Just sign up and get free things.
> This is the "I signed up for Stripe and got a free ChatGPT subscription" tier.

---

## WHAT'S ACTUALLY LIMITING YOUR APPS RIGHT NOW

### Your Current Stack (and where you'll hit walls)

**Firebase Realtime Database (Spark/Free Plan)**
- You get: 1 GB storage, 10 GB/month downloads, 100 simultaneous connections
- Your graduation-roadmap stores: patientRecords, competencies, appointments, completedProcedures, dashboardSnapshots, todoList, missingNotes, periodicReviews, grades, monthlyPlanner — all under one path
- **Where you'll hit a wall**: 100 simultaneous connections. If you ever share this app with classmates or try to make it a real product, 100 people using it at once = app stops working. Also 10GB/month download — every time you open the app, it downloads your entire data tree. With 4 apps all syncing, you're burning through this.
- **What fixes it**: Google Cloud for Startups gives you $2,000 in credits. That's enough for Firebase Blaze plan (pay-as-you-go) for YEARS. Unlimited connections, unlimited storage, unlimited downloads.

**Supabase (Free Plan — dental-pe-tracker)**
- You get: 500 MB database, 1 GB file storage, 2 GB bandwidth, 50K monthly active users
- **Where you'll hit a wall**: 500 MB database. Practice data, pipeline events, change tracking — this fills up fast. Also: free projects PAUSE after 1 week of inactivity.
- **What fixes it**: Supabase offers $2,500 in credits through partner programs. Google Cloud credits also work since Supabase runs on GCP.

**GitHub Pages (Free)**
- You get: 1 GB repo size, 100 GB/month bandwidth, 10 builds per hour
- **Where you'll hit a wall**: 100 GB bandwidth. Your body-comp-tracker.html alone is 22,444 lines. Every visitor downloads the whole thing. You're probably fine for personal use but this won't scale.
- **What fixes it**: Cloudflare (free) in front of GitHub Pages = unlimited bandwidth + CDN caching. Sign up for Cloudflare, point your domain through it, done.

**Claude (Max Subscription)**
- You get: Unlimited Claude Code usage (but throttled at peak times)
- **What you DON'T get**: API access for building AI features INTO your apps
- **What fixes it**: AWS Activate ($1K credits) includes Bedrock which has Claude API. Microsoft for Startups ($2.5K OpenAI credits). Anthropic Startup Program ($25K Claude API credits). NVIDIA Inception → AWS Portfolio → $100K Bedrock credits (includes Claude API).

**The bottom line**: Your biggest immediate constraints are Firebase connections/bandwidth, Supabase storage limits, and no API access for building AI features into your apps. All solvable with free programs below.

---

## THE "JUST SIGN UP" LIST

These are as easy as the Stripe thing that got you ChatGPT. Literally fill out a form and get free stuff.

### 1. GitHub Student Developer Pack
**What**: 100+ free tools because you have a .edu email
**How easy**: Go to the website, verify you're a BU student, done
**What you get for free**:
- GitHub Copilot (AI code assistant) — normally $10/month
- JetBrains (all IDEs) — normally $149-649/year
- $200 DigitalOcean credits (cloud hosting)
- $100 Azure credits (Microsoft cloud)
- Free .me domain name from Namecheap
- Canva Pro for 12 months
- And like 90 more things

**Go here**: https://education.github.com/pack
**Time**: 10 minutes

---

### 2. Microsoft for Startups
**What**: Free cloud credits, no questions asked
**How easy**: Go to website, sign up, get $1,000 in Azure credits IMMEDIATELY. No business required. No VC required. They literally just give it to you.
**What you get**:
- $1,000 in Azure credits (upgrade to $150K over time)
- $2,500 in OpenAI API credits (GPT-4, etc.)
- GitHub Enterprise free
- LinkedIn Premium free
- Visual Studio Enterprise free

**Why you care**: The $2,500 in OpenAI credits means you could build AI features into your apps (like AI-powered clinical analysis, smart patient recommendations, etc.)

**Go here**: https://www.microsoft.com/en-us/startups
**Time**: 10 minutes

---

### 3. Google Cloud for Startups (Start Tier)
**What**: $2,000 in Google Cloud credits — THIS DIRECTLY HELPS YOUR FIREBASE
**How easy**: Fill out a form, get approved in 3-10 days
**Why you NEED this**: Firebase runs on Google Cloud. These credits upgrade your Firebase from the free Spark plan to the Blaze plan FOR FREE. That means:
- Unlimited simultaneous connections (currently capped at 100)
- Unlimited database storage (currently 1 GB)
- Unlimited monthly downloads (currently 10 GB)
- Cloud Functions (run server-side code)
- $2,000 is enough to run Firebase Blaze for literally years at your usage level

**Go here**: https://cloud.google.com/startup
**Time**: 15 minutes

---

### 4. Figma Education
**What**: Figma Professional plan free for 2 YEARS
**How easy**: Verify .edu email, done
**Why you care**: If you ever want to design proper UI mockups before building, this is the industry standard tool. Worth $360 over 2 years.

**Go here**: https://www.figma.com/education
**Time**: 5 minutes

---

### 5. Notion Education
**What**: Notion Plus plan free (normally $10/month)
**How easy**: Verify .edu email
**Why you care**: Better than Google Docs for organizing everything — project plans, notes, databases

**Go here**: https://www.notion.com/education
**Time**: 5 minutes

---

### 6. Cloudflare (Free Plan)
**What**: Unlimited CDN, DDoS protection, SSL, DNS — in front of your GitHub Pages
**How easy**: Sign up, add your domain, done
**Why you NEED this**: Makes your apps load faster worldwide + unlimited bandwidth (GitHub Pages caps at 100GB/month). Also gets you Workers (serverless functions), R2 (free 10GB object storage), D1 (free database), and Pages (alternative hosting).

**Go here**: https://cloudflare.com
**Time**: 15 minutes

---

### 7. AWS Activate (Founders Tier)
**What**: $1,000 in AWS credits
**How easy**: Fill out a form with your product URL and GitHub
**Why you care**: AWS Bedrock gives you Claude API access. With $1K in credits, you could build AI features directly into your dental apps. Also S3 storage, Lambda functions, etc.

**Go here**: https://aws.amazon.com/activate
**Time**: 15 minutes

---

### 8. YC Startup School
**What**: Free 7-week course + community + eligible for $10K equity-free grants
**How easy**: Just sign up. Free. Online.
**Why you care**: Looks good on applications, teaches you the basics, and you might get $10K for free

**Go here**: https://startupschool.org
**Time**: 5 minutes

---

### 9. F6S
**What**: Gateway to hundreds of startup deals and credits
**How easy**: Create account, browse deals
**Why you care**: It's like a coupon book for startups. Sign up and you'll see deals for cloud credits, tools, etc. that you can claim.

**Go here**: https://f6s.com
**Time**: 5 minutes

---

### 10. Oracle Cloud Free Tier
**What**: 4 ARM CPUs, 24GB RAM, 200GB storage — FOREVER. Not a trial.
**How easy**: Sign up with credit card (won't be charged)
**Why you care**: This is an always-free virtual server more powerful than most paid hosting. If you ever need a backend server, this is free forever.

**Go here**: https://oracle.com/cloud/free
**Time**: 10 minutes

---

## TOTAL FROM "JUST SIGN UP" LIST

| What | Value |
|------|-------|
| Cloud credits (Azure + GCP + AWS + Oracle) | $4,000+ |
| OpenAI API credits | $2,500 |
| Developer tools (Copilot, JetBrains, etc.) | $2,000+/yr |
| Design tools (Figma, Canva) | $500+/yr |
| Productivity (Notion) | $120/yr |
| **Total first-year value** | **~$9,000+** |
| **Time to apply for all 10** | **~90 minutes** |

---

## BU & BOSTON STUFF (EXPLAINED LIKE YOU'RE 5)

### What is BU Innovate@BU?

Those emails you keep getting? Here's what they actually are:

**BU Innovate** is BU's entrepreneurship center. They have 3 things that matter to you:

#### 1. BUild Lab (Drop-in, free, no application)
- **What it is**: A physical space on campus where student entrepreneurs hang out, get advice, and work on their startups
- **What you do**: Walk in. Tell them "I'm a dental student and I built a SaaS app." Show them your phone with dental-quest open.
- **What you get**: Free mentorship, introductions to other BU entrepreneurs, access to workshops, and they'll tell you about competitions and grants
- **Why bother**: These are the people who will connect you to everything else on this list. They LOVE students who have already built something (most students who show up just have ideas).
- **Where**: Check bu.edu/innovate for location and hours

#### 2. BU New Venture Competition (Apply in fall)
- **What it is**: BU's annual startup competition. Cash prizes $5K-$30K+.
- **What you do**: Submit an application describing RCT Analytics. If selected, you pitch to judges.
- **What you get**: Cash prizes, no strings attached. No equity given up. Just free money if you win.
- **Why you'd win**: Most competitors have PowerPoint slides. You have a LIVE WORKING APP. You'd walk in, pull out your phone, and demo real software. Judges go crazy for that.
- **When**: Applications typically open in the fall, finals in spring. Watch for emails from BU Innovate.

#### 3. Summer Accelerator ($10K stipend)
- **What it is**: 10-week summer program. BU pays you $10K to work on your startup full-time over the summer.
- **What you do**: Apply in the spring for the summer program
- **What you get**: $10K cash, mentorship, workspace, demo day
- **When to apply**: Spring semester. Watch those BU Innovate emails!

### What is Venture Cafe Cambridge?

- **What it is**: Every Thursday night, hundreds of founders, investors, and tech people gather at the Cambridge Innovation Center (CIC). Free.
- **What you do**: Show up. Talk to people. When they ask what you do, say "I'm a dental student at BU building practice management software." Then show them your app on your phone.
- **What you get**: Connections. Advice. Potential co-founders. Investors who might be interested later.
- **Where**: CIC Cambridge (1 Broadway, Cambridge)
- **When**: Every Thursday, typically 3-8 PM
- **Cost**: Free. They have free drinks.
- **URL**: vfrtp.org

### What is MassChallenge?

- **What it is**: The biggest startup accelerator in Boston. They take NO EQUITY (most accelerators take 5-10% of your company). Cash prizes up to $100K+.
- **What you do**: Apply when their healthcare cohort opens (usually January-March). You describe your product and your vision.
- **What you get**: 10-week program, mentorship from 400+ experts, and the top startups get cash prizes. NO equity taken. Completely free.
- **Why it matters**: This is in your backyard and they specifically have a HealthTech track. "Dental student building dental SaaS" is exactly what they want.
- **When**: Watch for next application window at masschallenge.org

### What is NSF I-Corps (through BU)?

- **What it is**: The US government gives you $3,000-$50,000 to talk to potential customers and figure out if your product is something people would pay for.
- **What you do**: Go to BU's tech transfer office (or ask BU Innovate) and say "I want to do I-Corps." They'll pair you with a faculty mentor. You interview ~30 dentists/dental students about their pain points.
- **What you get**: $3K for the short version, $50K for the full version. Plus you learn if your app could actually be a business.
- **Why it's perfect**: You're literally surrounded by dental students and faculty who ARE your target market. The interviews would be easy.

---

## THE NVIDIA INCEPTION TRICK (This is the cheat code)

This is the single most important thing on this list. Here's why:

1. **Sign up for NVIDIA Inception** (free, nearly automatic acceptance): nvidia.com/startups
2. Inception membership makes you an "approved partner" for **AWS Activate Portfolio**
3. AWS Activate Portfolio gives you **up to $100,000 in AWS credits**
4. AWS credits include **Amazon Bedrock** which gives you **Claude API access**
5. Claude API in your apps = you can build AI features into dental-quest, graduation-roadmap, dental-pe-tracker

**The chain**: Free NVIDIA signup → $100K AWS → Claude API in your apps

Sign up for NVIDIA Inception. When it asks what AI/ML you're doing, say: "Clinical analytics and AI-powered workflow optimization for dental practice management." They accept basically everyone.

---

## WHAT YOU SHOULD ACTUALLY BUILD WITH THESE CREDITS

Once you have Google Cloud credits (Firebase upgrade) + AWS credits (Claude API) + Cloudflare (CDN), here's what becomes possible:

| Constraint Removed | What You Can Build |
|--------------------|--------------------|
| Firebase unlimited connections | Share graduation-roadmap with your entire dental class |
| Firebase unlimited storage | Store unlimited patient records, clinical data, procedure history |
| Claude API (via Bedrock) | AI clinical brief generator — paste in patient notes, get structured import blocks automatically |
| Claude API | AI study assistant integrated into graduation-roadmap — ask questions about your competency gaps |
| Claude API | Smart procedure recommendations based on patient history |
| Supabase upgrade (via GCP credits) | dental-pe-tracker can store unlimited practice data, pipeline events, market intelligence |
| Cloudflare CDN | Your apps load instantly worldwide, unlimited traffic |
| Oracle free server | Run background jobs — automated data sync, scheduled reports, email notifications |

The single most impactful thing: **Claude API → automatic clinical import block generation**. Instead of copy-pasting formatted text blocks into graduation-roadmap, you could just paste raw clinical notes and let Claude parse them into the right format automatically.

---

## INCORPORATION: DO YOU NEED IT?

**For everything above: NO.** You don't need a business to sign up for any of the "just sign up" programs.

**But if you ever want to**:
- Stripe Atlas = $500, takes 2 days, gives you a Delaware C-Corp + cascading partner perks worth $100K+
- Or just file an LLC in Massachusetts for ~$500 at mass.gov
- This unlocks: SBIR grants ($275K-$305K), Mercury banking (298 partner perks), Carta (cap table), and the "after incorporation" section of the master guide

**Don't do this yet.** Get the free stuff first. Incorporate when you have a reason to (first paying customer, or you want to apply for SBIR grants).

---

## YOUR 90-MINUTE ACTION PLAN

Sit down with a coffee. Open 10 browser tabs. Go top to bottom.

| Order | What | URL | Minutes |
|-------|------|-----|---------|
| 1 | GitHub Student Pack | education.github.com/pack | 10 |
| 2 | Microsoft for Startups | microsoft.com/startups | 10 |
| 3 | Google Cloud for Startups | cloud.google.com/startup | 15 |
| 4 | Cloudflare | cloudflare.com | 10 |
| 5 | AWS Activate | aws.amazon.com/activate | 10 |
| 6 | NVIDIA Inception | nvidia.com/startups | 10 |
| 7 | Figma Education | figma.com/education | 5 |
| 8 | Notion Education | notion.com/education | 5 |
| 9 | YC Startup School | startupschool.org | 5 |
| 10 | F6S | f6s.com | 5 |

**After 90 minutes you'll have**: ~$9,000 in credits/tools, your Firebase limits removed, Claude API access path unlocked, and you'll be in the YC system.

Then next week, walk into BU Innovate and say hi.

---

*Last updated: April 5, 2026*
