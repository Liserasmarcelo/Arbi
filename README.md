# 🎯 PolyArbitrage Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

> Aplicación web para arbitraje en Polymarket mediante bot de Telegram con conexión directa de wallets.

## 📖 Tabla de Contenidos

- [Descripción](#-descripción)
- [Características](#-características)
- [Cómo Funciona el Arbitraje](#-cómo-funciona-el-arbitraje)
- [Arquitectura](#-arquitectura)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Uso](#-uso)
- [API Reference](#-api-reference)
- [Desarrollo](#-desarrollo)
- [Despliegue](#-despliegue)
- [Seguridad](#-seguridad)
- [Disclaimer Legal](#-disclaimer-legal)
- [Contribución](#-contribución)

## 🎯 Descripción

PolyArbitrage Bot es una aplicación completa que permite detectar y ejecutar oportunidades de arbitraje en [Polymarket](https://polymarket.com), el mercado de predicción descentralizado más grande. La aplicación se integra directamente con Telegram para proporcionar una experiencia de usuario fluida en dispositivos móviles.

### ¿Qué es Polymarket?

Polymarket es un mercado de predicción descentralizado construido sobre Polygon donde los usuarios pueden comprar y vender posiciones en el resultado de eventos del mundo real. Cada mercado tiene dos tokens: YES y NO, cuyos precios reflejan la probabilidad percibida del evento.

## ✨ Características

### Core
- 🔍 **Scanner de Arbitraje**: Monitorea mercados en tiempo real buscando discrepancias de precios
- ⚡ **Ejecución Rápida**: Ejecuta trades en milisegundos cuando se detectan oportunidades
- 👛 **Conexión de Wallet**: Soporta MetaMask, WalletConnect y Coinbase Wallet
- 🤖 **Bot de Telegram**: Interfaz completa via Telegram con WebApp integrada

### Trading
- 📊 Detección automática cuando YES + NO ≠ 1.00
- 📈 Cálculo de beneficio esperado en tiempo real
- 🎯 Filtrado por umbral mínimo de ganancia
- ⚙️ Configuración de slippage y gas máximo

### Gestión de Riesgo
- 💰 Límite de pérdida diaria configurable
- 🔒 Tamaño máximo de posición
- ⏰ Cooldown automático después de pérdidas
- 📉 Tracking de métricas y win rate

### Notificaciones
- 🔔 Alertas push en Telegram
- 📱 Notificaciones de trades ejecutados
- ⚠️ Alertas de riesgo automáticas
- 📊 Resúmenes diarios opcionales

## 💡 Cómo Funciona el Arbitraje

En mercados de predicción, el arbitraje ocurre cuando la suma de los precios de YES y NO no es igual a 1.00:

### Oportunidad Tipo 1: YES + NO < 1.00 (Comprar ambas)

```
Ejemplo:
• Precio YES: 0.40 ($0.40)
• Precio NO:  0.58 ($0.58)
• Total:      0.98 ($0.98)

Inversión: $100
• Compras YES por: $40.82 (101.04 tokens)
• Compras NO por:  $59.18 (102.03 tokens)
• Total invertido: $100

Resultado al vencimiento:
• Uno de los tokens valdrá $1.00
• Garantizas al menos: $101.04 o $102.03
• Ganancia mínima: $1.04 - $2.03 (1-2%)
```

### Oportunidad Tipo 2: YES + NO > 1.00 (Vender ambas)

```
Ejemplo:
• Precio YES: 0.55 ($0.55)
• Precio NO:  0.48 ($0.48)
• Total:      1.03 ($1.03)

Vendes ambas posiciones por más de $1.00
Ganancia: 3% cuando el mercado se normaliza
```

### ⚠️ Consideraciones Importantes

- Las oportunidades duran **milisegundos a segundos**
- Hay **competencia intensa** con bots sofisticados
- Los **costos de gas** pueden eliminar beneficios pequeños
- El **slippage** puede reducir ganancias
- Polymarket puede cambiar su API sin previo aviso

## 🏗 Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENTE                                 │
├─────────────────┬─────────────────┬─────────────────────────┤
│  Telegram Bot   │   Web App       │   WebSocket Client      │
│  (grammy)       │   (Next.js)     │   (Real-time updates)   │
└────────┬────────┴────────┬────────┴─────────────┬───────────┘
         │                 │                       │
         ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│                     API SERVER                               │
│                     (Express.js)                             │
├─────────────────┬─────────────────┬─────────────────────────┤
│   Auth Routes   │ Arbitrage Routes│    User Routes          │
├─────────────────┴─────────────────┴─────────────────────────┤
│                      SERVICES                                │
├──────────────┬──────────────┬───────────────┬───────────────┤
│  Arbitrage   │    Trade     │     Risk      │  Notification │
│  Scanner     │   Executor   │   Manager     │    Service    │
└──────┬───────┴──────┬───────┴───────┬───────┴───────┬───────┘
       │              │               │               │
       ▼              ▼               ▼               ▼
┌──────────────┬──────────────┬───────────────────────────────┐
│  Polymarket  │   Polygon    │         PostgreSQL           │
│  CLOB API    │   Network    │         Redis                │
└──────────────┴──────────────┴───────────────────────────────┘
```

### Estructura del Proyecto

```
polyarbitrage-bot/
├── apps/
│   ├── api/              # Backend API (Express.js)
│   ├── web/              # Frontend WebApp (Next.js)
│   └── bot/              # Telegram Bot (grammy)
├── packages/
│   ├── types/            # Tipos TypeScript compartidos
│   ├── utils/            # Utilidades compartidas
│   └── polymarket-client/ # Cliente API de Polymarket
├── docker-compose.yml    # Configuración Docker
└── package.json          # Monorepo config (pnpm workspaces)
```

## 📋 Requisitos Previos

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **PostgreSQL** >= 15
- **Redis** >= 7
- **Docker** (opcional, recomendado)

### Cuentas Necesarias

1. **Telegram Bot** - Crear en [@BotFather](https://t.me/BotFather)
2. **WalletConnect** - Project ID de [WalletConnect Cloud](https://cloud.walletconnect.com/)
3. **Alchemy** (opcional) - API Key de [Alchemy](https://www.alchemy.com/)

## 🚀 Instalación

### Opción 1: Desarrollo Local

```bash
# Clonar repositorio
git clone https://github.com/tu-usuario/polyarbitrage-bot.git
cd polyarbitrage-bot

# Instalar dependencias
pnpm install

# Copiar variables de entorno
cp .env.example .env.local

# Configurar variables (editar .env.local)
nano .env.local

# Iniciar base de datos (con Docker)
docker-compose up -d postgres redis

# Ejecutar migraciones
pnpm db:push

# Iniciar en modo desarrollo
pnpm dev
```

### Opción 2: Docker Compose

```bash
# Copiar variables de entorno
cp .env.example .env

# Configurar variables
nano .env

# Iniciar todos los servicios
docker-compose up -d

# Ver logs
docker-compose logs -f
```

## ⚙️ Configuración

### Variables de Entorno Principales

```env
# Telegram
TELEGRAM_BOT_TOKEN=tu_token_de_botfather
TELEGRAM_WEBAPP_URL=https://tu-dominio.com

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=tu_project_id

# Base de Datos
DATABASE_URL=postgresql://user:pass@localhost:5432/polyarbitrage
REDIS_URL=redis://localhost:6379

# Blockchain
ALCHEMY_API_KEY=tu_clave_alchemy
POLYGON_RPC_URL=https://polygon-rpc.com

# Arbitraje
MIN_ARBITRAGE_THRESHOLD=0.5
MAX_POSITION_SIZE_USD=100
SLIPPAGE_TOLERANCE=0.01

# Riesgo
DAILY_LOSS_LIMIT_USD=100
MAX_CONCURRENT_TRADES=3
```

### Configuración del Bot de Telegram

1. Habla con [@BotFather](https://t.me/BotFather)
2. Crea un nuevo bot con `/newbot`
3. Guarda el token
4. Configura el menú con `/setmenu`:
   ```
   start - Iniciar la aplicación
   arbitraje - Buscar oportunidades
   wallet - Conectar/desconectar wallet
   historial - Ver operaciones
   config - Preferencias
   help - Ayuda
   legal - Información legal
   ```
5. Configura la WebApp con `/setmenubutton`:
   - URL: `https://tu-dominio.com`

## 📱 Uso

### Comandos del Bot

| Comando | Descripción |
|---------|-------------|
| `/start` | Inicia la aplicación y muestra menú principal |
| `/arbitraje` | Busca oportunidades de arbitraje actuales |
| `/wallet` | Conecta o desconecta tu wallet |
| `/historial` | Muestra historial de operaciones |
| `/config` | Configura preferencias de notificaciones y trading |
| `/help` | Muestra ayuda y explicación del arbitraje |
| `/legal` | Muestra disclaimer y términos legales |

### Flujo de Uso Típico

1. **Iniciar**: Envía `/start` al bot
2. **Conectar Wallet**: Usa `/wallet` para conectar MetaMask
3. **Configurar**: Ajusta preferencias con `/config`
4. **Buscar**: Busca oportunidades con `/arbitraje`
5. **Ejecutar**: Ejecuta trades desde la WebApp
6. **Monitorear**: Recibe notificaciones de resultados

## 📚 API Reference

### Endpoints Principales

#### Autenticación
```
POST /api/auth/nonce     - Obtener nonce para firma
POST /api/auth/verify    - Verificar firma y obtener JWT
POST /api/auth/telegram  - Autenticar via Telegram WebApp
POST /api/auth/refresh   - Refrescar token JWT
```

#### Mercados
```
GET /api/markets         - Lista de mercados activos
GET /api/markets/:id     - Detalles de un mercado
GET /api/markets/:id/orderbook - Orderbook del mercado
GET /api/markets/:id/prices    - Precios actuales
```

#### Arbitraje
```
GET  /api/arbitrage/opportunities     - Lista de oportunidades
GET  /api/arbitrage/opportunities/:id - Detalle de oportunidad
POST /api/arbitrage/execute          - Ejecutar arbitraje
GET  /api/arbitrage/status           - Estado del scanner
GET  /api/arbitrage/simulate         - Simular operación
```

#### Trades
```
GET  /api/trades          - Historial de trades
GET  /api/trades/:id      - Detalle de trade
GET  /api/trades/active   - Trades activos
POST /api/trades/:id/cancel - Cancelar trade
GET  /api/trades/stats    - Estadísticas
```

#### Usuario
```
GET  /api/user/profile    - Perfil del usuario
PUT  /api/user/settings   - Actualizar configuración
POST /api/user/wallet     - Vincular wallet
GET  /api/user/risk       - Métricas de riesgo
```

## 🛠 Desarrollo

### Estructura de Comandos

```bash
# Desarrollo
pnpm dev           # Iniciar todo en modo desarrollo
pnpm dev:web       # Solo frontend
pnpm dev:api       # Solo backend
pnpm dev:bot       # Solo bot

# Build
pnpm build         # Build de todo
pnpm typecheck     # Verificar tipos
pnpm lint          # Linting

# Base de datos
pnpm db:generate   # Generar cliente Prisma
pnpm db:push       # Sincronizar schema
pnpm db:migrate    # Ejecutar migraciones
```

### Testing

```bash
pnpm test          # Ejecutar tests
pnpm test:watch    # Tests en modo watch
pnpm test:coverage # Tests con cobertura
```

## 🚢 Despliegue

### Producción con Docker

```bash
# Build de imágenes
docker-compose build

# Deploy
docker-compose -f docker-compose.yml up -d
```

### Variables de Producción

Asegúrate de configurar:
- `NODE_ENV=production`
- URLs de producción
- Secrets seguros
- SSL/TLS configurado

## 🔒 Seguridad

### Mejores Prácticas Implementadas

- ✅ Nunca almacenamos claves privadas
- ✅ Autenticación via firma de wallet
- ✅ Validación de datos de Telegram
- ✅ Rate limiting en API
- ✅ HTTPS obligatorio en producción
- ✅ Sanitización de inputs
- ✅ JWT con expiración corta

### Recomendaciones

- Usa un firewall y fail2ban
- Mantén las dependencias actualizadas
- Monitorea logs por actividad sospechosa
- Realiza backups regulares
- Limita el acceso a la base de datos

## ⚖️ Disclaimer Legal

### ⚠️ ADVERTENCIA DE RIESGO

**El trading de arbitraje en mercados de predicción conlleva riesgos significativos:**

- 💸 **Pérdida de capital**: Puedes perder parte o todo tu capital invertido
- 🐛 **Riesgo tecnológico**: Bugs, hacks o fallos de sistema pueden causar pérdidas
- 📉 **Riesgo de liquidez**: Puede que no puedas cerrar posiciones al precio deseado
- ⚖️ **Riesgo regulatorio**: Las leyes pueden cambiar y afectar la operación
- ⛽ **Costos de gas**: Las comisiones pueden eliminar los beneficios

### 🚫 Jurisdicciones Restringidas

Este servicio **NO está disponible** para residentes de:
- 🇺🇸 Estados Unidos
- 🇨🇦 Canadá
- 🇨🇳 China
- 🇮🇷 Irán
- 🇰🇵 Corea del Norte
- 🇸🇾 Siria
- 🇨🇺 Cuba

### 📜 Términos de Uso

Al usar este software:
- Confirmas que tienes al menos 18 años
- Aceptas todos los riesgos asociados
- Confirmas que cumples con las leyes de tu jurisdicción
- Entiendes que **NO proporcionamos asesoría financiera**
- Entiendes que **NO garantizamos ganancias**

**Consulta con un profesional financiero antes de invertir.**

## 🤝 Contribución

Las contribuciones son bienvenidas. Por favor:

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 📞 Soporte

- 📧 Email: soporte@polyarbitrage.com
- 💬 Telegram: [@PolyArbitrageSupport](https://t.me/PolyArbitrageSupport)
- 🐛 Issues: [GitHub Issues](https://github.com/tu-usuario/polyarbitrage-bot/issues)

---

**⚠️ Este software se proporciona "tal cual" sin garantías de ningún tipo. Úsalo bajo tu propio riesgo.**
