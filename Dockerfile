# ---- build ----
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock* package-lock.json* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then npm ci; \
    else npm install; fi

COPY tsconfig.json ./
COPY server.ts ./
COPY scripts ./scripts
COPY src ./src
COPY public ./public
COPY env.d.ts ./

RUN npm run build

# ---- runtime ----
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package.json yarn.lock* package-lock.json* ./
RUN if [ -f yarn.lock ]; then yarn install --frozen-lockfile --production && yarn cache clean; \
    elif [ -f package-lock.json ]; then npm ci --omit=dev && npm cache clean --force; \
    else npm install --omit=dev && npm cache clean --force; fi

COPY --from=builder /app/build ./build
COPY --from=builder /app/public ./public
COPY server.js ./

# Email templates are read from disk at runtime (ejs paths like src/emails/...)
COPY --from=builder /app/src/emails ./src/emails

RUN mkdir -p uploads

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||5000)+'/health',(r)=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
