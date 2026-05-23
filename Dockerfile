# ==========================================
# Etapa 1: Compilación del Frontend (React/Vite)
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ==========================================
# Etapa 2: Construcción y Ejecución del Backend
# ==========================================
FROM node:22-alpine
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev
COPY backend/ ./backend/
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Configuración del contenedor
ENV PORT=3000
EXPOSE 3000

WORKDIR /app/backend
CMD ["node", "server.js"]
