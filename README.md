# Edtechhubet Mail

Gmail inbox, branded replies, saved contact lists and batch campaigns, deployed on Vercel.

## 1. Google Cloud setup (about 10 minutes)

1. Go to https://console.cloud.google.com and create a project named "Edtechhubet Mail".
2. APIs & Services > Library > search "Gmail API" > Enable.
3. APIs & Services > OAuth consent screen:
   - User type: External. App name: Edtechhubet Mail. Support and developer email: yabutech47@gmail.com.
   - Scopes: add `.../auth/gmail.modify`.
   - Test users: add yabutech47@gmail.com (and any other mailbox that will sign in).
4. APIs & Services > Credentials > Create credentials > OAuth client ID > Web application.
   - Authorized redirect URIs (add both):
     - `https://YOUR-PROJECT.vercel.app/api/auth/callback`
     - `http://localhost:3000/api/auth/callback`
   - Copy the Client ID and Client secret.

## 2. Put the code on GitHub

Create a new private repository, then from this folder:

    git init
    git add .
    git commit -m "Edtechhubet Mail"
    git branch -M main
    git remote add origin https://github.com/YOUR-USER/edtechhubet-mail.git
    git push -u origin main

## 3. Deploy on Vercel

1. Vercel dashboard > Add New > Project > import the repository. Leave Framework Preset as "Other".
2. Before deploying, open Environment Variables and add:

| Name | Value |
|---|---|
| GOOGLE_CLIENT_ID | from step 1 |
| GOOGLE_CLIENT_SECRET | from step 1 |
| APP_URL | `https://YOUR-PROJECT.vercel.app` (no trailing slash) |
| SESSION_SECRET | output of `openssl rand -hex 32` |
| ALLOWED_EMAILS | `yabutech47@gmail.com` |
| ANTHROPIC_API_KEY | optional, enables Smart draft and Polish text |

3. Deploy. If the final domain differs from the one in step 1, update the redirect URI in Google and APP_URL in Vercel, then redeploy.

## 4. First sign-in

Open your Vercel URL > Sign in with Google. Google shows "Google hasn't verified this app": choose Advanced > Continue. This is normal while the app is in Testing mode.

## Run locally

    npm i -g vercel
    npm install
    cp .env.example .env.local   # fill it in, APP_URL=http://localhost:3000
    vercel dev

## Notes

- Testing mode: Google expires refresh tokens after 7 days for unpublished apps, so you sign in again weekly. To stop this, publish the OAuth app. The gmail.modify scope is restricted, so public use needs Google verification (or use a Google Workspace account and set the app to Internal).
- Auto-reply runs while the dashboard is open in a browser tab. Contact lists and sent history are stored in that browser.
- Gmail limits personal accounts to roughly 500 sent messages per day.
