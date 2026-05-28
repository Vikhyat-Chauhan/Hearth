# Deploy Checklist — Vercel + Railway

## Read this when: deploying for the first time or debugging a failed deploy

## Vercel (Next.js)
```bash
# First deploy
vercel                    # follow prompts, links to GitHub repo
vercel --prod             # promote to production

# Set env vars (do this before first prod deploy)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY

# Redeploy after env changes
vercel --prod

# Check build logs
vercel logs               # tail recent logs
```

## Railway (FastAPI / any backend)
1. Push code to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Select repo, Railway auto-detects Python/Node
4. Add env vars in the Railway dashboard → Variables tab
5. Get the public URL from Railway dashboard → Settings → Networking

## Common failure modes
| Error | Fix |
|-------|-----|
| `Module not found` | Check import paths, run `npm run build` locally first |
| `500` on API route | Check env vars are set in Vercel dashboard |
| CORS error | Add `Access-Control-Allow-Origin` header in API route |
| Supabase auth redirect fails | Add Vercel URL to Supabase → Auth → URL Configuration |

## Pre-deploy checklist (30 seconds)
- [ ] `npm run build` passes locally
- [ ] Env vars set in Vercel/Railway dashboard
- [ ] Supabase URL allowlist updated (if new domain)
- [ ] At least one happy-path test passes on the deployed URL

## GitHub CLI shortcuts
```bash
gh repo create <name> --public --source=. --push   # create + push in one command
gh pr create --fill                                 # open PR with auto-filled title/body
gh pr merge --squash                               # merge current PR
```
