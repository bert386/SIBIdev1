# 🛍️ SIBI – Should I Buy It (v4.2.0)

SIBI is a web app designed for collectors, resellers, and thrifters. Upload a photo of a bulk lot (games, DVDs, books, toys, etc.) and instantly get:

- 📸 Item identification (via OpenAI Vision)
- 💰 Value estimates from real eBay sold listings
- 📈 Sell-through rate (STR) insights
- 🔍 Summary and filtering tools
- 💡 Fast, mobile-friendly interface

---

## ✅ Feature Overview

### 🔍 Core Functionality
- **Bulk Image Upload**: Drag-and-drop or file input for one or more images
- **OpenAI Vision Analysis**: Detects item name, category, platform, and release year (if available)

---

### 💰 Pricing Engine (HTML Scraping)
- **Sold Listings Lookup**:
  - Scrapes `ebay.com.au` for the **10 most recent sold listings**
  - Extracts title, price, and URL
  - Calculates **average value in AUD**
- **STR (Sell-Through Rate)**:
  - Compares number of sold vs active listings
  - `STR = sold / (sold + active)`
  - Displayed alongside each item

---

### 🧾 Frontend Features
- **Value Summary**:
  - Total estimated lot value
  - Average STR across all items
  - Top 3 most valuable items

- **Interactive Filtering**:
  - Toggle to display only items with **STR ≥ 50%**

- **Results Table per Image**:
  - Item Name
  - Estimated Value (AUD)
  - STR %
  - "View" button to open modal of sold listings

- **Modal Popup**:
  - Displays last 10 sold items with:
    - Title
    - Price
    - Direct eBay listing link

---

### 📱 User Experience
- **Drag-and-Drop Upload UI**: Mobile-friendly and intuitive
- **Responsive Design**: Adapts to small screens
- **Clean Layout**: Minimal, accessible, and styled for readability
- **Version Display**: Visible version label (`v4.2.0`) on the interface

---

## 🛠️ Dev Notes
- **Backend**: Node.js using Vercel Serverless Functions
- **Scraping**: HTML parsing with Cheerio (no eBay API required)
- **Vision**: OpenAI GPT-4 Vision model
- **Deployment**: Optimized for Vercel

---

## 🔮 Future Features (Planned)
- Export to CSV
- STR threshold slider
- Barcode/UPC scanning fallback
- History + saved analysis
- eBay API integration (if Marketplace Insights access granted)

---

## 🚀 Quick Start
1. Clone or unzip the repo
2. Add your OpenAI API key to `.env`:
   ```
   OPENAI_API_KEY=your-key-here
   ```
3. Deploy to [Vercel](https://vercel.com/) or run locally with your preferred dev server

---

> Built for speed, clarity, and secondhand treasure hunters.