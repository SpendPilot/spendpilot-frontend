FROM node:20-alpine

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json* ./

RUN npm install

COPY tsconfig.json next.config.mjs next-env.d.ts postcss.config.js tailwind.config.ts ./
COPY app ./app
COPY components ./components
COPY lib ./lib

RUN npm run build

ENV NODE_ENV=production

CMD ["npm", "run", "start"]
