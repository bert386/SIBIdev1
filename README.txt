SIBI v1.0.3 Deployment Instructions (Vercel)

This project is now flattened to Vercel's preferred structure:
- /api          → Vercel Serverless Functions
- /src          → All frontend files at root
- /dist         → Vite output folder (auto generated on build)

To deploy:
1. Push this repo to GitHub.
2. Import into Vercel.
3. Vercel will detect Vite + build frontend to /dist.
4. Backend will be deployed from /api.

You will now get a working live frontend by default.
