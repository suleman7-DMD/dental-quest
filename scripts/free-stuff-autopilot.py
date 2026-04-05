#!/usr/bin/env python3
"""
RCT Analytics — Free Stuff Autopilot
=====================================
Guides Sully through every free program step-by-step.
Opens URLs, copies form answers to clipboard, tracks progress.
Run anytime to pick up where you left off.

Usage: python3 ~/dental-quest/scripts/free-stuff-autopilot.py

== WHAT THIS SCRIPT DOES (for Claude Code / debugging) ==

PURPOSE: Interactive CLI that walks through 16 free startup programs
(cloud credits, AI credits, student tools, BU/Boston programs). For each
program it: opens the signup URL in the browser, copies pre-written form
answers to the clipboard one at a time, and tells the user what to click.
Progress is saved to docs/.free-stuff-progress.json so you can quit and
resume later.

PROGRAMS COVERED (in order):
  JUST SIGN UP (10 programs):
    1. GitHub Student Developer Pack ($2K+/yr tools)
    2. Microsoft for Startups ($1K Azure + $2.5K OpenAI)
    3. Google Cloud for Startups ($2K Firebase/GCP credits)
    4. Cloudflare free (CDN, Workers, R2, D1)
    5. AWS Activate Founders ($1K credits + Bedrock/Claude API)
    6. NVIDIA Inception (free → unlocks AWS $100K)
    7. Figma Education (2yr free Pro)
    8. Notion Education (free Plus)
    9. YC Startup School (free + $10K grant eligible)
    10. F6S deal aggregator
  APPLY THIS WEEK (1 program):
    11. Anthropic Claude Startup Program ($25K API credits)
  BU & BOSTON (4 programs):
    12. BU Innovate / BUild Lab ($10K accelerator)
    13. Venture Cafe Cambridge (free weekly networking)
    14. MassChallenge HealthTech (no equity, $100K+ prizes)
    15. NSF I-Corps through BU ($3K-$50K)
  UNLOCK CHAIN (1 program):
    16. AWS Portfolio upgrade via NVIDIA ($100K credits)

HOW IT WORKS:
  - PROFILE dict at top has pre-filled business info (name, URLs, descriptions)
  - PROGRAMS list defines each program with id, url, and step-by-step instructions
  - Steps can be: OPEN (opens URL), DO (instruction), COPY (copies a PROFILE
    field to clipboard), COPY_TEXT (copies a long pre-written answer), DONE (summary)
  - Progress saved as JSON: {"completed": ["id1",...], "skipped": ["id2",...]}
  - Menu: number to run one, 'a' for all remaining, 's' to skip, 'q' to quit

DEBUGGING GUIDE:
  If a program's URL changed or doesn't work:
    → Update the "url" field in the PROGRAMS list entry
  If a form asks different questions than expected:
    → Update the "steps" list for that program
  If clipboard copy doesn't work:
    → The script uses `pbcopy` (macOS only). Check `which pbcopy`.
  If progress is stuck/corrupted:
    → Delete docs/.free-stuff-progress.json and re-run
    → Or press 'r' in the menu to reset
  If you need to change pre-filled answers:
    → Edit the PROFILE dict below (business_name, descriptions, etc.)
  If you want to add a new program:
    → Add a new dict to the PROGRAMS list following the same format

TO ASK CLAUDE CODE FOR HELP:
  Open a new Claude Code session in ~/dental-quest and say:
  "I'm running scripts/free-stuff-autopilot.py and [describe your issue].
   Read the script and help me fix it."
  Claude will read the script header and understand everything.
"""

import json
import subprocess
import sys
import webbrowser
from datetime import datetime
from pathlib import Path

# ─── Config ───────────────────────────────────────────────────────────────────
PROGRESS_FILE = Path(__file__).parent.parent / "docs" / ".free-stuff-progress.json"

PROFILE = {
    "name": "Suleman Shaikh",
    "email_edu": "",  # Fill in your BU email on first run
    "business_name": "RCT Analytics",
    "product_url": "https://suleman7-dmd.github.io/dental-quest/",
    "github_url": "https://github.com/suleman7-DMD/dental-quest",
    "school": "Boston University Goldman School of Dental Medicine",
    "graduation": "May 2027",
    "degree": "DMD (Doctor of Dental Medicine)",
    "location": "Boston, MA",
    "description_short": "Dental practice analytics and clinical workflow management SaaS",
    "description_long": "RCT Analytics builds AI-powered clinical workflow optimization tools for dental education and practice management. Our flagship product is a 6-app ecosystem including graduation tracking, clinical competency management, patient records with a 9-block import system, Firebase real-time sync across 4 apps, pharmacokinetic sleep prediction modeling, and a 22,444-line body composition tracker.",
    "industry": "Healthcare / Dental Technology",
    "stage": "Pre-revenue, live product",
    "team_size": "1 (solo founder)",
    "funding": "$0 (bootstrapped)",
    "stripe_account": "acct_1T8r9yBSlJEf37g1",
}

# ─── Programs ─────────────────────────────────────────────────────────────────

PROGRAMS = [
    # ── TIER 1: Just Sign Up (5-15 min each) ──
    {
        "id": "github-student-pack",
        "name": "GitHub Student Developer Pack",
        "tier": "JUST SIGN UP",
        "value": "$2,000+/yr (Copilot, JetBrains, $200 DO, $100 Azure, domains, 90+ tools)",
        "time": "10 min",
        "url": "https://education.github.com/pack",
        "steps": [
            ("OPEN", "Opening GitHub Student Developer Pack page..."),
            ("DO", "Click 'Get your pack' or 'Sign up for Student Developer Pack'"),
            ("DO", "Sign in with your GitHub account (suleman7-DMD)"),
            ("DO", "Select 'Student' and pick 'Boston University' as your school"),
            ("COPY", "email_edu", "Enter your BU .edu email when prompted"),
            ("DO", "Upload proof of enrollment (BU student ID photo or enrollment letter)"),
            ("DO", "Submit and wait for approval (usually 1-3 days)"),
            ("DONE", "Once approved you'll get: GitHub Copilot free, JetBrains free, $200 DigitalOcean, $100 Azure, free .me domain, Canva Pro, and 90+ more tools"),
        ],
    },
    {
        "id": "microsoft-startups",
        "name": "Microsoft for Startups Founders Hub",
        "tier": "JUST SIGN UP",
        "value": "$1,000 Azure + $2,500 OpenAI API credits + GitHub Enterprise + LinkedIn Premium",
        "time": "10 min",
        "url": "https://www.microsoft.com/en-us/startups",
        "steps": [
            ("OPEN", "Opening Microsoft for Startups..."),
            ("DO", "Click 'Join now' or 'Apply now'"),
            ("DO", "Sign in with a Microsoft account (create one if needed)"),
            ("COPY", "business_name", "Company name:"),
            ("COPY", "product_url", "Company website:"),
            ("COPY", "description_short", "What does your startup do:"),
            ("DO", "Industry: select 'Healthcare' or 'Health Tech'"),
            ("DO", "Stage: select 'Idea' or 'Pre-revenue'"),
            ("DO", "Funding: select 'Bootstrapped' or '$0'"),
            ("DO", "Team size: 1"),
            ("DO", "Submit the application"),
            ("DONE", "You'll get $1,000 Azure credits immediately. OpenAI credits ($2,500) unlock in the dashboard under 'Benefits'. Check back in 1-2 days."),
        ],
    },
    {
        "id": "google-cloud-startups",
        "name": "Google Cloud for Startups (FIXES YOUR FIREBASE)",
        "tier": "JUST SIGN UP",
        "value": "$2,000 GCP/Firebase credits — removes 100-connection cap",
        "time": "15 min",
        "url": "https://cloud.google.com/startup",
        "why": "#1 most impactful program. Upgrades Firebase from Spark (100 connections, 1GB) to Blaze (unlimited) FOR FREE.",
        "steps": [
            ("OPEN", "Opening Google Cloud for Startups..."),
            ("DO", "Click 'Apply now' for the Start tier (no funding required)"),
            ("DO", "Sign in with your Google account"),
            ("COPY", "business_name", "Company name:"),
            ("COPY", "product_url", "Website URL:"),
            ("COPY", "description_long", "Company description:"),
            ("DO", "Industry: Healthcare / Health Tech"),
            ("DO", "Stage: Pre-revenue / Early stage"),
            ("DO", "Funding: Bootstrapped / $0"),
            ("COPY", "github_url", "If asked for product demo or repository:"),
            ("DO", "Submit. Approval takes 3-10 business days."),
            ("DONE", "Once approved: Go to Firebase Console > Project Settings > Upgrade to Blaze. GCP credits cover costs. 100-connection cap GONE."),
        ],
    },
    {
        "id": "cloudflare",
        "name": "Cloudflare (Free Plan)",
        "tier": "JUST SIGN UP",
        "value": "Unlimited CDN, SSL, DDoS, Workers, R2 storage, Pages hosting",
        "time": "10 min",
        "url": "https://dash.cloudflare.com/sign-up",
        "steps": [
            ("OPEN", "Opening Cloudflare signup..."),
            ("DO", "Create a free account with your email"),
            ("DO", "You don't need to add a domain right now. Account gives access to:"),
            ("DO", "  - Workers (100K free requests/day for serverless functions)"),
            ("DO", "  - R2 (10GB free object storage)"),
            ("DO", "  - D1 (free serverless database)"),
            ("DO", "  - Pages (free hosting)"),
            ("DONE", "Account created. All free tools accessible from dashboard."),
        ],
    },
    {
        "id": "aws-activate",
        "name": "AWS Activate (Founders Tier)",
        "tier": "JUST SIGN UP",
        "value": "$1,000 AWS credits (includes Bedrock = Claude API)",
        "time": "15 min",
        "url": "https://aws.amazon.com/activate/",
        "steps": [
            ("OPEN", "Opening AWS Activate..."),
            ("DO", "Click 'Apply for AWS Activate' > Founders tier"),
            ("DO", "Create AWS account if needed (credit card required, won't be charged)"),
            ("COPY", "business_name", "Organization name:"),
            ("COPY", "product_url", "Company website:"),
            ("COPY", "description_short", "What does your startup do:"),
            ("DO", "Stage: Pre-revenue / Bootstrapped"),
            ("DO", "Submit. Approval typically 7-10 business days."),
            ("DONE", "Once approved: AWS Console > Amazon Bedrock > Enable Claude. You now have Claude API for your apps."),
        ],
    },
    {
        "id": "nvidia-inception",
        "name": "NVIDIA Inception (THE CHEAT CODE)",
        "tier": "JUST SIGN UP",
        "value": "Free > unlocks AWS Portfolio ($100K), GPU pricing, partner credits",
        "time": "10 min",
        "url": "https://www.nvidia.com/en-us/startups/",
        "why": "Free, nearly auto-accepted. Once in, apply for AWS Portfolio tier = $100,000 in credits.",
        "steps": [
            ("OPEN", "Opening NVIDIA Inception..."),
            ("DO", "Click 'Apply Now'"),
            ("COPY", "business_name", "Company name:"),
            ("COPY", "product_url", "Website:"),
            ("COPY_TEXT", "Clinical analytics and AI-powered workflow optimization for dental practice management. We use machine learning for clinical decision support, pharmacokinetic modeling, and patient outcome prediction.", "AI/ML usage description:"),
            ("DO", "Industry: Healthcare"),
            ("DO", "Stage: Early stage / Pre-seed"),
            ("DO", "Submit. Nearly automatic approval."),
            ("DONE", "Once accepted: Go BACK to AWS Activate > apply for PORTFOLIO tier using NVIDIA Inception as partner. Upgrades from $1K to $100K."),
        ],
    },
    {
        "id": "figma-education",
        "name": "Figma Education",
        "tier": "JUST SIGN UP",
        "value": "Professional plan free 2 years ($360)",
        "time": "5 min",
        "url": "https://www.figma.com/education/",
        "steps": [
            ("OPEN", "Opening Figma Education..."),
            ("DO", "Click 'Get verified'"),
            ("COPY", "email_edu", "Enter BU .edu email:"),
            ("DO", "Verify student status"),
            ("DONE", "Figma Professional free for 2 years."),
        ],
    },
    {
        "id": "notion-education",
        "name": "Notion Education",
        "tier": "JUST SIGN UP",
        "value": "Plus plan free ($120/yr)",
        "time": "5 min",
        "url": "https://www.notion.com/product/notion-for-education",
        "steps": [
            ("OPEN", "Opening Notion Education..."),
            ("DO", "Sign up or log in"),
            ("COPY", "email_edu", "Use BU .edu email:"),
            ("DO", "Verify student status"),
            ("DONE", "Notion Plus activated. Unlimited blocks and file uploads."),
        ],
    },
    {
        "id": "yc-startup-school",
        "name": "YC Startup School",
        "tier": "JUST SIGN UP",
        "value": "Free course + eligible for $10K grants",
        "time": "5 min",
        "url": "https://www.startupschool.org/",
        "steps": [
            ("OPEN", "Opening YC Startup School..."),
            ("DO", "Click 'Enroll' or 'Sign Up'"),
            ("COPY", "business_name", "Company name:"),
            ("COPY", "description_short", "Description:"),
            ("COPY", "product_url", "Website:"),
            ("DO", "Complete registration"),
            ("DONE", "You're in. Complete weekly updates to stay eligible for $10K equity-free grants."),
        ],
    },
    {
        "id": "f6s",
        "name": "F6S (Deal Aggregator)",
        "tier": "JUST SIGN UP",
        "value": "$100M+ in deals and credits",
        "time": "5 min",
        "url": "https://www.f6s.com/",
        "steps": [
            ("OPEN", "Opening F6S..."),
            ("DO", "Click 'Join Free' and create account"),
            ("DO", "Create startup profile for RCT Analytics"),
            ("COPY", "description_short", "Description:"),
            ("DO", "Browse 'Deals' section for credits"),
            ("DONE", "Access to hundreds of startup deals. Check back for new offers."),
        ],
    },

    # ── TIER 2: Apply This Week ──
    {
        "id": "anthropic-startups",
        "name": "Anthropic Claude Startup Program",
        "tier": "APPLY THIS WEEK",
        "value": "Up to $25,000 in Claude API credits",
        "time": "20 min",
        "url": "https://claude.com/programs/startups",
        "why": "You've spent $4K+ in Claude usage building a live product. Dream applicant.",
        "steps": [
            ("OPEN", "Opening Anthropic Startup Program..."),
            ("COPY", "business_name", "Company name:"),
            ("COPY", "product_url", "Product URL:"),
            ("COPY", "github_url", "GitHub URL:"),
            ("COPY_TEXT", "RCT Analytics is a 6-app dental practice management ecosystem built entirely with Claude Code. Over 73 hours of active Claude usage, $4,000+ in equivalent API value consumed. Our apps include a 12-module graduation tracker with clinical competency management, patient records with 9-block import system, Firebase real-time sync across 4 apps, pharmacokinetic sleep prediction modeling, and a 22,444-line body composition tracker. We want Claude API access to build AI-powered clinical import parsing, patient outcome prediction, and smart clinical decision support directly into our apps.", "How you'll use Claude API:"),
            ("DO", "Fill out the rest of the application"),
            ("DONE", "If approved: up to $25K Claude API credits for building AI into your dental apps."),
        ],
    },

    # ── TIER 3: BU & Boston ──
    {
        "id": "bu-innovate",
        "name": "BU Innovate / BUild Lab",
        "tier": "BU & BOSTON",
        "value": "$10K accelerator + mentorship + competitions",
        "time": "Walk-in or 15 min email",
        "url": "https://www.bu.edu/innovate/",
        "steps": [
            ("OPEN", "Opening BU Innovate..."),
            ("DO", "Check events calendar for upcoming workshops and office hours"),
            ("DO", "WALK IN during open hours, or send this email:"),
            ("COPY_TEXT", "Hi, I'm Suleman Shaikh, a D3 dental student at Goldman. I've built a 6-app dental practice analytics platform that's live and deployed at suleman7-dmd.github.io/dental-quest/. I'd love to learn about BU's startup resources — especially the New Venture Competition and Summer Accelerator. When could I stop by or chat?", "Email to BU Innovate:"),
            ("DO", "Ask about: New Venture Competition, Summer Accelerator ($10K), seed grants"),
            ("DONE", "You're on their radar. They'll loop you into competitions and mentorship."),
        ],
    },
    {
        "id": "venture-cafe",
        "name": "Venture Cafe Thursday Gathering",
        "tier": "BU & BOSTON",
        "value": "Free weekly networking — founders & investors",
        "time": "Show up Thursday 3-8 PM",
        "url": "https://vfrtp.org/",
        "steps": [
            ("OPEN", "Opening Venture Cafe info..."),
            ("DO", "CIC Cambridge, 1 Broadway, Cambridge MA"),
            ("DO", "Every Thursday, 3-8 PM. Free entry. Free drinks."),
            ("COPY_TEXT", "I'm a dental student at BU and I built a dental practice analytics platform — it's live and I can show you on my phone.", "Your intro line:"),
            ("DO", "Show them suleman7-dmd.github.io/dental-quest/ on your phone"),
            ("DO", "Collect LinkedIn connections. Follow up next day."),
            ("DONE", "Go 2-3x. Regulars will know you. This is where you find advisors and early users."),
        ],
    },
    {
        "id": "masschallenge",
        "name": "MassChallenge HealthTech",
        "tier": "BU & BOSTON",
        "value": "No equity, up to $100K+ prizes",
        "time": "30 min when apps open",
        "url": "https://masschallenge.org/programs-all/",
        "steps": [
            ("OPEN", "Opening MassChallenge..."),
            ("DO", "Check if HealthTech applications are open (usually Jan-March)"),
            ("DO", "If open: Create account and start application"),
            ("COPY", "business_name", "Startup name:"),
            ("COPY", "description_long", "Description:"),
            ("COPY_TEXT", "RCT Analytics addresses the $160B dental industry's reliance on outdated practice management software. As a dental student, I identified critical gaps in clinical workflow tracking, competency management, and practice analytics. Our platform is live and deployed, serving as both a dental education tool and a practice management prototype.", "Impact statement:"),
            ("DO", "If not open: Bookmark and check back January 2027"),
            ("DONE", "NO equity taken. Top performers win cash. In your backyard."),
        ],
    },
    {
        "id": "nsf-icorps",
        "name": "NSF I-Corps (through BU)",
        "tier": "BU & BOSTON",
        "value": "$3,000-$50,000 for customer discovery",
        "time": "Email + follow-up",
        "url": "https://new.nsf.gov/funding/initiatives/i-corps",
        "steps": [
            ("OPEN", "Opening NSF I-Corps info..."),
            ("DO", "Email BU Office of Technology Development:"),
            ("COPY_TEXT", "Hi, I'm Suleman Shaikh, a D3 dental student at Goldman School of Dental Medicine. I've built a dental practice analytics software platform (live at suleman7-dmd.github.io/dental-quest/) and I'm interested in the NSF I-Corps program to validate commercial potential. Could you connect me with the right person? I'd also appreciate guidance on finding a faculty advisor.", "Email to BU OTD:"),
            ("DO", "The Short Course ($3K) = 30 interviews over a few weeks"),
            ("DO", "Full Teams ($50K) = more intensive but big money"),
            ("DONE", "Faculty advisor + I-Corps application. Interviews are easy — your classmates ARE the market."),
        ],
    },

    # ── TIER 4: NVIDIA → AWS $100K Chain ──
    {
        "id": "aws-portfolio-upgrade",
        "name": "AWS Portfolio Upgrade (after NVIDIA)",
        "tier": "UNLOCK CHAIN",
        "value": "$1K → $100K in AWS credits",
        "time": "15 min (after NVIDIA approval)",
        "url": "https://aws.amazon.com/activate/",
        "prereq": "nvidia-inception",
        "steps": [
            ("DO", "WAIT for NVIDIA Inception acceptance email first!"),
            ("OPEN", "Opening AWS Activate..."),
            ("DO", "Apply for PORTFOLIO tier (not Founders)"),
            ("DO", "Activate Provider: select 'NVIDIA Inception'"),
            ("DO", "Enter your NVIDIA Inception membership ID"),
            ("COPY", "business_name", "Organization:"),
            ("COPY", "product_url", "Website:"),
            ("DO", "Submit"),
            ("DONE", "Up to $100K AWS credits for 2 years. Includes Bedrock (Claude API), S3, Lambda, everything."),
        ],
    },
]

# ─── Helpers ──────────────────────────────────────────────────────────────────

def load_progress():
    if PROGRESS_FILE.exists():
        return json.loads(PROGRESS_FILE.read_text())
    return {"completed": [], "skipped": [], "started_at": datetime.now().isoformat()}

def save_progress(progress):
    PROGRESS_FILE.write_text(json.dumps(progress, indent=2))

def copy_to_clipboard(text):
    proc = subprocess.Popen(['pbcopy'], stdin=subprocess.PIPE)
    proc.communicate(text.encode('utf-8'))

def clear_screen():
    subprocess.call(['clear'])

def c(text, color):
    colors = {"g": "\033[92m", "y": "\033[93m", "b": "\033[94m", "r": "\033[91m",
              "c": "\033[96m", "m": "\033[95m", "B": "\033[1m", "d": "\033[2m", "0": "\033[0m"}
    return f"{colors.get(color, '')}{text}{colors['0']}"

def header(text):
    print(f"\n{c('=' * 60, 'd')}")
    print(f"  {c(text, 'B')}")
    print(f"{c('=' * 60, 'd')}\n")

def ask(msg="Press ENTER when done (or 's' to skip, 'q' to quit)"):
    try:
        r = input(f"\n  {c('>', 'c')} {msg} ").strip().lower()
        if r == 'q': return 'quit'
        if r == 's': return 'skip'
        return 'ok'
    except (KeyboardInterrupt, EOFError):
        return 'quit'

# ─── Main ─────────────────────────────────────────────────────────────────────

def check_profile():
    if not PROFILE["email_edu"]:
        clear_screen()
        header("FIRST: Your BU email")
        print("  I need your BU .edu email to auto-fill forms.")
        print("  Stored locally only.\n")
        try:
            email = input(f"  {c('>', 'c')} BU .edu email: ").strip()
        except (KeyboardInterrupt, EOFError):
            sys.exit(0)
        if email:
            PROFILE["email_edu"] = email
            print(f"\n  {c('OK', 'g')}: {email}")
            input(f"\n  {c('>', 'c')} Press ENTER to start ")

def run_program(program, progress):
    clear_screen()
    header(program['name'])

    print(f"  {c('Value:', 'g')} {program['value']}")
    print(f"  {c('Time:', 'y')} {program['time']}")
    if program.get('why'):
        print(f"  {c('Why:', 'm')} {program['why']}")
    if program.get('prereq') and program['prereq'] not in progress['completed']:
        print(f"\n  {c('!! PREREQ:', 'r')} Complete '{program['prereq']}' first!")
        r = ask("ENTER to try anyway, 's' skip, 'q' quit")
        if r != 'ok': return r

    print(f"\n  {c('Steps:', 'B')}\n")

    for i, step in enumerate(program['steps'], 1):
        action = step[0]
        if action == "OPEN":
            print(f"  {c(f'[{i}]', 'b')} {step[1]}")
            webbrowser.open(program['url'])
            input(f"      {c('>', 'd')} Browser opened. ENTER to continue...")
        elif action == "DO":
            print(f"  {c(f'[{i}]', 'y')} {step[1]}")
        elif action == "COPY":
            val = PROFILE.get(step[1], "???")
            copy_to_clipboard(val)
            print(f"  {c(f'[{i}]', 'g')} {step[2]}")
            print(f"      {c('COPIED:', 'c')} {val}")
        elif action == "COPY_TEXT":
            copy_to_clipboard(step[1])
            preview = step[1][:80] + "..." if len(step[1]) > 80 else step[1]
            print(f"  {c(f'[{i}]', 'g')} {step[2]}")
            print(f"      {c('COPIED:', 'c')} {preview}")
        elif action == "DONE":
            print(f"\n  {c('DONE:', 'g')} {step[1]}")

    return ask()

def show_menu(progress):
    clear_screen()
    done = len(progress['completed'])
    header(f"Free Stuff Autopilot ({done}/{len(PROGRAMS)} complete)")

    tiers = {}
    for p in PROGRAMS:
        tiers.setdefault(p['tier'], []).append(p)

    idx = 1
    pmap = {}
    for tier, progs in tiers.items():
        print(f"  {c(f'-- {tier} --', 'B')}")
        for p in progs:
            ok = p['id'] in progress['completed']
            sk = p['id'] in progress['skipped']
            mark = c("done", "g") if ok else (c("skip", "y") if sk else "    ")
            name = c(p['name'], 'd') if ok else p['name']
            print(f"  {mark} {c(str(idx), 'c')}) {name}")
            pmap[idx] = p
            idx += 1
        print()

    print(f"  {c('a', 'c')}) Run ALL remaining    {c('r', 'c')}) Reset    {c('q', 'c')}) Quit\n")

    try:
        ch = input(f"  {c('>', 'c')} Choice: ").strip().lower()
    except (KeyboardInterrupt, EOFError):
        return None, None

    if ch == 'q': return None, None
    if ch == 'r': return 'reset', None
    if ch == 'a': return 'all', pmap
    try:
        n = int(ch)
        if n in pmap: return 'one', pmap[n]
    except ValueError:
        pass
    return 'bad', None

def main():
    progress = load_progress()
    check_profile()

    while True:
        action, data = show_menu(progress)

        if action is None:
            print(f"\n  {c('Saved!', 'g')} Run again anytime to continue.\n")
            save_progress(progress)
            break
        elif action == 'reset':
            progress = {"completed": [], "skipped": [], "started_at": datetime.now().isoformat()}
            save_progress(progress)
        elif action == 'bad':
            input(f"  {c('Invalid. ENTER to retry.', 'r')}")
        elif action == 'one':
            r = run_program(data, progress)
            if r == 'quit':
                save_progress(progress)
                break
            elif r == 'skip':
                if data['id'] not in progress['skipped']:
                    progress['skipped'].append(data['id'])
            else:
                if data['id'] not in progress['completed']:
                    progress['completed'].append(data['id'])
            save_progress(progress)
        elif action == 'all':
            for idx in sorted(data.keys()):
                p = data[idx]
                if p['id'] in progress['completed']:
                    continue
                r = run_program(p, progress)
                if r == 'quit':
                    save_progress(progress)
                    return
                elif r == 'skip':
                    if p['id'] not in progress['skipped']:
                        progress['skipped'].append(p['id'])
                else:
                    if p['id'] not in progress['completed']:
                        progress['completed'].append(p['id'])
                save_progress(progress)

            clear_screen()
            header("ALL DONE!")
            print("  Next steps:")
            print("  1. Wait for approval emails (1-10 days)")
            print("  2. Google Cloud approved > upgrade Firebase to Blaze")
            print("  3. NVIDIA approved > apply AWS Portfolio ($100K)")
            print("  4. Walk into BU Innovate and say hi\n")
            input(f"  {c('>', 'c')} ENTER to exit ")
            break

def show_help():
    print(f"""
  {c('Free Stuff Autopilot', 'B')} — RCT Analytics

  {c('Usage:', 'y')}
    python3 ~/dental-quest/scripts/free-stuff-autopilot.py          Run the tool
    python3 ~/dental-quest/scripts/free-stuff-autopilot.py --help    Show this help
    python3 ~/dental-quest/scripts/free-stuff-autopilot.py --debug   Show progress & debug info
    python3 ~/dental-quest/scripts/free-stuff-autopilot.py --reset   Reset all progress

  {c('Inside the tool:', 'y')}
    Type a number    Run that program
    a                Run ALL remaining programs in order
    s                Skip current program
    q                Quit (progress auto-saved)
    r                Reset progress

  {c('If something breaks:', 'y')}
    Open a new Claude Code session in ~/dental-quest and say:
    "I'm running scripts/free-stuff-autopilot.py and [describe issue].
     Read the script and help me fix it."

  {c('Files:', 'y')}
    Script:    ~/dental-quest/scripts/free-stuff-autopilot.py
    Progress:  ~/dental-quest/docs/.free-stuff-progress.json
    Full guide: ~/dental-quest/docs/EASY_FREE_STUFF_GUIDE.md
    Master ref: ~/dental-quest/docs/RCT_ANALYTICS_MASTER_FUNDING_GUIDE.md
""")

def show_debug():
    progress = load_progress()
    total = len(PROGRAMS)
    done = len(progress['completed'])
    skipped = len(progress['skipped'])
    remaining = total - done

    print(f"\n  {c('Debug Info', 'B')}\n")
    print(f"  Progress file: {PROGRESS_FILE}")
    print(f"  File exists: {PROGRESS_FILE.exists()}")
    print(f"  Started: {progress.get('started_at', 'unknown')}")
    print(f"  Total programs: {total}")
    print(f"  Completed: {done}")
    print(f"  Skipped: {skipped}")
    print(f"  Remaining: {remaining}")

    if progress['completed']:
        print(f"\n  {c('Completed:', 'g')}")
        for pid in progress['completed']:
            name = next((p['name'] for p in PROGRAMS if p['id'] == pid), pid)
            print(f"    {pid} ({name})")

    if progress['skipped']:
        print(f"\n  {c('Skipped:', 'y')}")
        for pid in progress['skipped']:
            name = next((p['name'] for p in PROGRAMS if p['id'] == pid), pid)
            print(f"    {pid} ({name})")

    remaining_programs = [p for p in PROGRAMS if p['id'] not in progress['completed']]
    if remaining_programs:
        print(f"\n  {c('Remaining:', 'c')}")
        for p in remaining_programs:
            print(f"    {p['id']} ({p['name']}) — {p['value']}")

    print(f"\n  {c('Profile:', 'B')}")
    for k, v in PROFILE.items():
        preview = str(v)[:60] + "..." if len(str(v)) > 60 else str(v)
        print(f"    {k}: {preview}")
    print()

if __name__ == "__main__":
    if "--help" in sys.argv or "-h" in sys.argv:
        show_help()
    elif "--debug" in sys.argv:
        show_debug()
    elif "--reset" in sys.argv:
        progress = {"completed": [], "skipped": [], "started_at": datetime.now().isoformat()}
        save_progress(progress)
        print(f"\n  {c('Progress reset!', 'g')} Run the script again to start fresh.\n")
    else:
        main()
