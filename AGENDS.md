# AGENDS.md - Especificaciones del Proyecto y Directrices para Agentes

Este archivo define las especificaciones técnicas del proyecto, su arquitectura, el entorno de despliegue y las directrices obligatorias para cualquier Agente de IA que interactúe o realice modificaciones en este repositorio.

---

## 📌 1. Visión General del Proyecto
Esta es una **aplicación web Fullstack de gestión de datos de entrenamiento y salud**. Se integra de forma nativa con la **API de Strava** mediante autenticación OAuth para recopilar, estructurar, analizar y visualizar métricas de rendimiento deportivo, fatiga, eficiencia aeróbica, distribución de zonas de ritmo cardíaco y preparación para el entrenamiento (Training Readiness).

Además, cuenta con un módulo de inteligencia artificial (**AI Coach**) que proporciona recomendaciones y análisis personalizados basados en el historial deportivo del usuario.

---

## 🛠️ 2. Arquitectura y Stack Tecnológico

La aplicación está dividida en dos componentes principales y se empaqueta de manera unificada mediante Docker:

### A. Backend (`/backend`)
*   **Tecnología**: Node.js con Express.
*   **Dependencias principales**: `axios` para consumo de APIs externas, `cors` para políticas de origen, `dotenv` para configuración segura.
*   **Funcionalidades**:
    *   Flujo de autenticación OAuth 2.0 de Strava.
    *   Gestión de tokens de acceso y refresco de Strava.
    *   Endpoints REST para actividades físicas (`/api/activities`), métricas agregadas y estadísticas históricas.
    *   Manejo de caché de datos y almacenamiento en archivos JSON de respaldo (ej. `activities.json`) para optimizar el rendimiento y no superar los límites de la API de Strava.

### B. Frontend (`/frontend`)
*   **Tecnología**: React (v19) y Vite como empaquetador.
*   **Visualización de Datos**: `recharts` para gráficos interactivos e intuitivos de rendimiento, volumen y eficiencia.
*   **Iconografía**: `lucide-react`.
*   **Estilos**: CSS Puro (Vanilla CSS) enfocado en una estética visual premium y moderna (modos oscuros, glassmorphism, gradientes suaves y micro-animaciones interactivas).

---

## 🚀 3. Infraestructura y Despliegue

*   **Entorno de Producción**: La aplicación se encuentra desplegada en un **servidor VPS** (Virtual Private Server) propio.
*   **Método de Despliegue**: Se automatiza y sincroniza a través de **GitHub** y contenedores **Docker**.
*   **Estrategia de Docker (`Dockerfile`)**:
    *   **Etapa 1 (Frontend Builder)**: Utiliza `node:22-alpine` para compilar el frontend y generar los archivos de producción en `/frontend/dist`.
    *   **Etapa 2 (Backend & Runner)**: Copia los archivos estáticos compilados en la primera etapa al directorio del backend (`/backend/dist` o `/frontend/dist`), levanta el servidor Node.js en el puerto `3000` y expone este único puerto, encargándose el backend de servir tanto la API como la interfaz web.

---

## 🤖 4. Directrices Mandatorias para Agentes de IA

Si eres un Agente de IA trabajando en este repositorio, debes cumplir estrictamente las siguientes reglas:

### 🌐 Idioma de Interacción
> [!IMPORTANT]
> **Todas las interacciones, explicaciones, planes de implementación y respuestas al usuario deben realizarse exclusivamente en ESPAÑOL.** 
> Sin embargo, el código fuente (nombres de variables, funciones, comentarios de código y commits) debe mantener las convenciones en inglés estándar de la industria.

### 🎨 Estilo y Diseño Visual (UX/UI)
*   **Alineación Estética**: La interfaz debe sentirse sumamente premium, viva y fluida. Utiliza esquemas de color bien calibrados (preferiblemente basados en variables HSL en `frontend/src/index.css`), esquemas oscuros sofisticados y evita a toda costa colores planos o genéricos (como rojo puro, azul puro, etc.).
*   **Vanilla CSS**: Prioriza el uso de Vanilla CSS modular en vez de frameworks utilitarios como Tailwind CSS a menos que se solicite explícitamente. Centraliza las propiedades de diseño y variables globales en el sistema de diseño de `index.css`.
*   **Interactividad**: Implementa micro-transiciones suaves (`transition: all 0.3s ease`) en botones, enlaces, tarjetas y elementos interactivos para elevar la experiencia del usuario.

### 💻 Prácticas de Codificación y Desarrollo
*   **Integridad del Código**: Nunca elimines comentarios existentes, docstrings o lógica de negocio que no esté directamente relacionada con tu tarea actual.
*   **Modificaciones No Destructivas**: Al editar componentes React existentes (como [TrainingReadiness.jsx](file:///Users/miguelangelmatarranzsanchez/Desktop/aplicaciones-web/Strava/frontend/src/components/TrainingReadiness.jsx) o [FitnessChart.jsx](file:///Users/miguelangelmatarranzsanchez/Desktop/aplicaciones-web/Strava/frontend/src/components/FitnessChart.jsx)), asegúrate de conservar la lógica compleja de cálculo matemático y deportivo (TSS, Fatiga, Fitness, zonas de frecuencia cardíaca).
*   **Mocking e Integridad de Datos**: Ten cuidado al modificar archivos JSON de respaldo como `activities.json`. Asegúrate de que el backend pueda continuar funcionando de manera autónoma en caso de que las credenciales de Strava expiren.

---

## 🔍 5. Revisión de Código y Calidad (Code Quality)

Para mantener un estándar de calidad elevado en la aplicación y evitar regresiones en producción en el VPS, se establecen los siguientes requisitos obligatorios de revisión de código:

### A. Estilo de Código y Linter
*   **Frontend**: Es mandatorio ejecutar `npm run lint` en `/frontend` antes de proponer cambios para asegurar la coherencia del estilo y evitar advertencias o errores de ESLint.
*   **Backend**: Mantener una estructura de código limpia con `async/await` bien controlado y un manejo explícito de errores.

### B. Lista de Verificación (Checklist) para Cambios
*   **Cero Credenciales en Código**: Nunca almacenar llaves de API, credenciales de Strava (`Client ID`, `Client Secret`) ni variables de entorno directamente en el código. Todo debe gestionarse mediante el archivo `.env` en desarrollo o variables de entorno en el VPS.
*   **Manejo de Errores Resiliente**:
    *   Tanto en el backend como en el frontend, cada llamada asíncrona o petición de red debe estar envuelta en bloques `try/catch`.
    *   Si falla la comunicación con la API de Strava, la aplicación debe mostrar una advertencia amigable en la UI y usar los datos de caché/mock de forma transparente en lugar de romperse.
*   **Optimización de React (Rendimiento)**:
    *   Evitar renderizados infinitos controlando con precisión los arrays de dependencias de `useEffect`.
    *   Utilizar `useMemo` o `useCallback` para cálculos complejos de métricas deportivas (como volumen, distribución cardíaca o preparación física) para no ralentizar el hilo principal.
*   **Cero Placeholders**: No subir código con marcadores de posición ("Placeholders"), textos de relleno ("Lorem Ipsum") o comentarios `TODO` pendientes de resolver para producción.

### C. Commits y Ramas
*   **Mensajes de Commit Claros**: Utilizar mensajes que describan qué se cambia y el porqué, preferiblemente siguiendo el estándar de Commits Convencionales (ej: `feat: ...`, `fix: ...`, `style: ...`).

---

## 📈 6. ¿Qué más se podría añadir a futuro en estas especificaciones? (Recomendaciones)

Para mantener este documento actualizado y robusto, se sugiere ir añadiendo:

1.  **Esquema detallado de la Base de Datos / JSON**: Documentar la estructura de los objetos de actividad (distancias, promedios de vatios, ritmos, frecuencia cardíaca) que el backend procesa para que los agentes sepan exactamente qué datos están disponibles sin realizar consultas manuales repetitivas.
2.  **Guía detallada de Configuración de Webhooks de Strava**: Si se implementa la sincronización en tiempo real en el VPS, documentar cómo se gestiona el Endpoint de Webhooks y el proceso de validación del handshake de Strava.
3.  **Matriz de Roles y Flujo de Autenticación**: Un diagrama en texto o Mermaid que ilustre detalladamente el ciclo de vida del token OAuth (incluyendo el refresco automático con `refresh_token` cuando el `access_token` expira cada 6 horas).
4.  **Lista de Variables de Entorno Obligatorias**: Mantener documentado el conjunto completo de variables requeridas tanto en desarrollo como en producción en el VPS (ej. `PORT`, `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`, `NODE_ENV`).
