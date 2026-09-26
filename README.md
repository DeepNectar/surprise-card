# 💕 Surprise Card

A personalised surprise card web app — filled with messages, photos, videos, countdowns, and memories — made just for someone special.

![Version](https://img.shields.io/badge/version-2.2-blueviolet)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

- 🎂 **Tap-to-open cake** animation with confetti
- 💌 **Personalised messages** with typewriter effect
- 💕 **3 live counters** (talk, yes, engaged… or any dates)
- 🎁 **Gift boxes** with slideshow photos
- 📖 **Story pages** with autoplay
- 📅 **Event countdowns** with timezone support
- 🔊 **Voice messages** and 🎬 **video messages**
- 🗺️ **Map of memories** with pins
- 📸 **Full-screen slideshow** with effects, floaters, and music
- 💬 **WhatsApp share** with credentials
- ⭐ **Review system** with star ratings
- 🌐 **Multi-language** (English, ગુજરાતી, हिन्दी)
- 🌙 **Dark mode**
- 🎨 **14 themes** (romantic, family, birthday, elegant, royal…)
- ✍️ **Guest submission flow** with Excel template + admin approval
- 📊 **Complete Excel backup** (export + import)

---

## 🚀 Deploy to Netlify

1. Push this folder to a GitHub repo.
2. Go to [Netlify](https://app.netlify.com/) → **Add new site → Import an existing project**.
3. Connect your GitHub repo.
4. Set **Build command** = *(leave empty)* and **Publish directory** = `.`
5. Click **Deploy**. Done!

---

## 🔧 Configuration

Edit `js/config.js`:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase anon key |
| `PUBLIC_CARD_LINK` | Public card link used in shares |
| `FALLBACK_ADMIN_PW` | Fallback admin password |
| `DEFAULT_TZ` | Default timezone (e.g. `Asia/Dubai`) |

---

## 🔐 Admin Access

**Triple-click** the 🎂💕 emoji on the home screen.

Default fallback password: `Deepnectar@@1617@@`

From the admin panel you can:
- Edit any person's text, theme, counters, gifts, story, events, voice, video, pins, and media
- Add / edit / delete people
- Approve or reject guest submissions
- Export / import a full Excel backup
- Manage reviews

---

## 📂 Structure
