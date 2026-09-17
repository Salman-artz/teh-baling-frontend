FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json ./
COPY node_modules ./node_modules
COPY .next ./.next
COPY public ./public

EXPOSE 3000
CMD ["node_modules/.bin/next", "start", "-p", "3000"]
