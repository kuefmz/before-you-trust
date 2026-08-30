# Environment & Deployment

## Example `.env.local`
```bash
TAVILY_API_KEY=
BRAVE_SEARCH_API_KEY=
```

Do not prefix secret keys with `NEXT_PUBLIC_`.

## Local development
```bash
npm install
npm run dev
```

## Amplify deployment
1. Push the repository to GitHub.
2. Create an AWS Amplify app from the repository.
3. Connect `dev` first as the development/preview environment.
4. Add the selected search API key as an Amplify environment variable.
5. Validate the full search flow on the preview deployment.
6. Connect `main` only when there is a release-ready version.
7. Connect the custom domain to the production branch when ready.

## Production logging
Before launch, make sure request logs do not persist searched names or context fields unnecessarily.

## Environment separation
- Local: developer machine, local-only secrets.
- Dev: Amplify preview branch with development credentials/quotas.
- Production: main branch with separate production configuration.

Never commit `.env.local` or provider credentials.
