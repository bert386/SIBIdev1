SIBI v1.0.1 Deployment Instructions (Vercel)

This project is structured as:
- /frontend → React app using Vite
- /api → Serverless functions (Node.js)
- /vercel.json → Build instructions for Vercel

To deploy:
1. Push this repo to GitHub.
2. Import into Vercel.
3. Vercel will detect the build using vercel.json and:
   - Run `vite build` in /frontend
   - Deploy backend from /api

Frontend will be built into /frontend/dist and routed correctly.

Ensure your OpenAI keys and future env vars go into Vercel project settings.
