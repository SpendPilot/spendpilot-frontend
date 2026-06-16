# Frontend

The frontend is a Next.js 14 application for the Spend Control finance workspace.

Primary pages:

- `/login`
- `/dashboard`
- `/expenses`
- `/approvals`
- `/budgets`
- `/documents`
- `/scan`
- `/settings`

Auth model:

- Microsoft Entra SPA flow with MSAL in production
- Session storage cache
- Dev-only local auth fallback for local development

Routing expectation:

- Browser calls `/api`
- Azure Front Door forwards to kGateway
- HTTPRoutes split the call to the correct backend microservice
