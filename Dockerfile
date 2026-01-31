# =========================
# Build stage
# =========================
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# =========================
# Runtime stage
# =========================
FROM node:18-alpine

WORKDIR /app

RUN npm install -g serve

# Copy build output
COPY --from=builder /app/dist ./dist

# Copy entrypoint
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
