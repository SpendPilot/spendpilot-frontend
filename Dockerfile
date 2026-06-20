FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci

FROM node:20-alpine AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json* ./
COPY tsconfig.json next.config.mjs next-env.d.ts postcss.config.js tailwind.config.ts ./
COPY app ./app
COPY components ./components
COPY lib ./lib

RUN npm run build

FROM node:20-alpine AS prod-deps

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev

FROM node:20-alpine AS runner

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN addgroup -g 1001 -S nodejs \
    && adduser -S nextjs -u 1001

COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start"]
