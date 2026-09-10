FROM node:26.8.1-alpine
LABEL org.opencontainers.description="A Discord bot for starboard capabilities in your server"
RUN apk add --no-cache python3 py3-pip make g++
WORKDIR /app
RUN addgroup -S dcbot && adduser -S dcbot -G dcbot
COPY package*.json ./
RUN npm ci --omit=dev --no-fund --silent
COPY --chown=dcbot:dcbot . .
ENV DOTENV_DEBUG=false
USER dcbot
CMD ["npm", "run","start"]