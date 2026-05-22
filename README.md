# Dashboard de Strava - Fullstack

Este proyecto es una aplicación web fullstack que se conecta a la API de Strava para visualizar y analizar tus actividades deportivas. Cuenta con un **Frontend** desarrollado en React + Vite + Tailwind CSS / Vanilla CSS y un **Backend** desarrollado en Node.js + Express.

---

## Requisitos previos

Para poder ejecutar este proyecto, necesitas tener instalado en tu sistema:
- **Node.js** (versión 18 o superior recomendada)
- **npm** (incluido por defecto con Node.js)
- Una cuenta de **Strava** y una aplicación creada en el portal de desarrolladores de Strava para obtener las credenciales de la API.

---

## Estructura del Proyecto

```
Strava/
├── backend/        # Servidor API de Node.js + Express
├── frontend/       # Cliente Web de React + Vite
└── README.md       # Guía de inicio y documentación
```

---

## Instrucciones de Instalación y Ejecución

Si te descargas o clonas este proyecto en un nuevo equipo, sigue estos pasos para arrancarlo:

### 1. Clonar o descargar el proyecto
Si usas Git, clona el repositorio:
```bash
git clone https://github.com/mmatarranz/strava.git
cd strava
```

---

### 2. Configurar y Arrancar el Backend

1. Entra en el directorio del backend:
   ```bash
   cd backend
   ```
2. Instala las dependencias necesarias:
   ```bash
   npm install
   ```
3. Configura las variables de entorno. Crea un archivo llamado `.env` copiando el archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```
4. Abre el archivo `.env` que acabas de crear y reemplaza los valores de ejemplo con tus credenciales reales de la API de Strava:
   - `STRAVA_CLIENT_ID`: ID de tu cliente de Strava.
   - `STRAVA_CLIENT_SECRET`: Código secreto de tu cliente.
   - `STRAVA_REDIRECT_URI`: Debe coincidir exactamente con la que configuraste en tu portal de Strava (por ejemplo: `http://localhost:3000/api/auth/callback`).

5. Arranca el servidor del backend:
   ```bash
   node server.js
   ```
   *El backend estará escuchando en `http://localhost:3000`.*

---

### 3. Configurar y Arrancar el Frontend

1. Abre una nueva pestaña o ventana de la terminal, ve a la raíz del proyecto y entra en el directorio del frontend:
   ```bash
   cd frontend
   ```
2. Instala las dependencias necesarias:
   ```bash
   npm install
   ```
3. Arranca el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   *El frontend estará listo en el puerto por defecto de Vite (generalmente `http://localhost:5173`).*

---

## Primer inicio de sesión

1. Abre en tu navegador la dirección del frontend (`http://localhost:5173`).
2. Haz clic en **Autenticar con Strava** o inicia sesión.
3. Serás redirigido a la página oficial de autorización de Strava para conceder permisos de lectura a la aplicación.
4. Una vez autorizado, volverás automáticamente al dashboard y podrás ver el análisis completo de tus datos, gráficos de rendimiento semanal/anual y panel de recuperación de salud.
