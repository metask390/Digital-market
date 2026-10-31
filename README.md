# Egg Market

A play-to-earn 3D chicken farm. Next.js (App Router, static export) + Tailwind CSS +
React Three Fiber / drei, with Supabase (email + password, no OTP) as the backend.

## Setup
1. In Supabase, run `supabase/schema.sql` in the SQL editor (tables, RLS, atomic RPCs, storage bucket).
2. Authentication > Providers > Email: keep Email on, turn **Confirm email OFF**.
3. Provide `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`).
4. Sign up in the app, then make yourself admin in the SQL editor:
   `insert into public.game_admins (user_id) select id from auth.users where email = 'you@example.com';`

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm typecheck
pnpm build      # static export -> dist/
```

## Pages
| Route | Purpose |
| --- | --- |
| `/` | Login / Create Account (3D farm scene on top, curved white form below) |
| `/game/market` | 10 chicken tiers, Buy modal (qty x price, live payment details, proof upload) |
| `/game/dashboard` | My Farm: 2-column chicken cards, 24h timers, collectible eggs, Sell All Eggs |
| `/game/profile` | Wallet, total invested, referral link, withdrawals + history |
| `/game/admin` | Payment settings, deposit + withdrawal approvals, users list with Block/Unblock |

## Architecture
- `public/chicken.glb`, `public/farmhouse.glb` are loaded with `useGLTF` and rendered via `<primitive object={scene} />`.
  Lighting: sunset environment (self-hosted HDR in `public/hdri`), `ambientLight`, shadow-casting `directionalLight`.
- Many chicken cards share one WebGL canvas (drei `<View>`), so large farms stay within browser limits.
- All money-moving actions are `SECURITY DEFINER` Postgres functions (`game_collect_egg`, `game_sell_eggs`,
  `game_request_withdrawal`, `game_admin_approve_deposit`, `game_admin_reject_withdrawal`, ...), so balances can
  never be edited from the browser. Row Level Security limits reads to the owner (or admin).
- Direct/referral withdraw limits live only in the database; the UI never shows them.

## Source layout
`src/app` pages · `src/components` UI + `three/` scenes · `src/lib` Supabase client, API, formatting · `supabase/schema.sql`.
