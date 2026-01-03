# 🚀 Guía de Configuración de PolyArbitrage Bot

Esta guía te llevará paso a paso a través del proceso de configuración del bot desde cero.

## Tabla de Contenidos

1. [Requisitos Previos](#1-requisitos-previos)
2. [Crear Bot de Telegram](#2-crear-bot-de-telegram)
3. [Configurar WalletConnect](#3-configurar-walletconnect)
4. [Configurar Wallet de Desarrollo](#4-configurar-wallet-de-desarrollo)
5. [Instalación del Proyecto](#5-instalación-del-proyecto)
6. [Configurar Variables de Entorno](#6-configurar-variables-de-entorno)
7. [Iniciar Servicios](#7-iniciar-servicios)
8. [Probar el Bot](#8-probar-el-bot)
9. [Despliegue en Producción](#9-despliegue-en-producción)

---

## 1. Requisitos Previos

### Software Necesario

```bash
# Verificar versiones instaladas
node --version    # Debe ser >= 18.0.0
pnpm --version    # Debe ser >= 8.0.0
docker --version  # Opcional pero recomendado
```

### Instalación de pnpm

```bash
# Con npm
npm install -g pnpm

# O con corepack (Node.js >= 16.13)
corepack enable
corepack prepare pnpm@latest --activate
```

### Cuentas Necesarias

- [ ] Cuenta de Telegram
- [ ] Cuenta de WalletConnect Cloud
- [ ] Wallet compatible con Polygon (MetaMask recomendado)
- [ ] (Opcional) Cuenta de Alchemy

---

## 2. Crear Bot de Telegram

### Paso 2.1: Crear el Bot

1. Abre Telegram y busca [@BotFather](https://t.me/BotFather)
2. Envía `/newbot`
3. Sigue las instrucciones:
   - Nombre del bot: `PolyArbitrage Bot`
   - Username: `PolyArbitrageBot` (debe terminar en 'bot')
4. **Guarda el token** que te proporciona (ejemplo: `123456789:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

### Paso 2.2: Configurar el Menú

Envía estos comandos a BotFather:

```
/setcommands
```

Selecciona tu bot y envía:

```
start - Iniciar la aplicación
arbitraje - Buscar oportunidades de arbitraje
wallet - Conectar/desconectar wallet
historial - Ver historial de operaciones
config - Configurar preferencias
help - Mostrar ayuda
legal - Información legal y disclaimer
```

### Paso 2.3: Configurar WebApp (Opcional - Para Producción)

```
/setmenubutton
```

Selecciona tu bot y proporciona la URL de tu WebApp.

### Paso 2.4: Configurar Descripción

```
/setdescription
```

```
🎯 PolyArbitrage Bot

Detecta y ejecuta oportunidades de arbitraje en Polymarket de forma automática.

✅ Escaneo en tiempo real
✅ Conexión directa de wallet
✅ Gestión de riesgos
✅ Notificaciones automáticas

¡Haz clic en START para comenzar!
```

---

## 3. Configurar WalletConnect

### Paso 3.1: Crear Proyecto

1. Ve a [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto
4. **Copia el Project ID**

### Paso 3.2: Configurar Dominios

En la configuración del proyecto, añade los dominios permitidos:
- `localhost` (para desarrollo)
- Tu dominio de producción

---

## 4. Configurar Wallet de Desarrollo

### Paso 4.1: Crear Wallet de Pruebas

1. Instala [MetaMask](https://metamask.io/)
2. Crea una nueva wallet (o usa una existente)
3. **IMPORTANTE**: Esta es solo para pruebas, no uses tu wallet principal

### Paso 4.2: Añadir Red Polygon Mumbai (Testnet)

En MetaMask:
1. Settings > Networks > Add Network
2. Añade estos datos:
   - Network Name: `Polygon Mumbai`
   - RPC URL: `https://rpc-mumbai.maticvigil.com`
   - Chain ID: `80001`
   - Currency: `MATIC`
   - Explorer: `https://mumbai.polygonscan.com`

### Paso 4.3: Obtener MATIC de Prueba

1. Ve al [Polygon Faucet](https://faucet.polygon.technology/)
2. Selecciona Mumbai Network
3. Pega tu dirección de wallet
4. Solicita MATIC de prueba

---

## 5. Instalación del Proyecto

### Paso 5.1: Clonar Repositorio

```bash
git clone https://github.com/tu-usuario/polyarbitrage-bot.git
cd polyarbitrage-bot
```

### Paso 5.2: Instalar Dependencias

```bash
pnpm install
```

### Paso 5.3: Configurar Prisma

```bash
# Generar cliente de Prisma
pnpm db:generate
```

---

## 6. Configurar Variables de Entorno

### Paso 6.1: Copiar Template

```bash
cp .env.example .env.local
```

### Paso 6.2: Editar Variables

```bash
nano .env.local
```

Configura estas variables mínimas:

```env
# Telegram
TELEGRAM_BOT_TOKEN=tu_token_de_botfather_aqui

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=tu_project_id_aqui

# Base de Datos (para Docker)
DATABASE_URL=postgresql://polyarbitrage:polyarbitrage123@localhost:5432/polyarbitrage
REDIS_URL=redis://localhost:6379

# Red (para pruebas)
ACTIVE_NETWORK=testnet
```

---

## 7. Iniciar Servicios

### Opción A: Con Docker (Recomendado)

```bash
# Iniciar PostgreSQL y Redis
docker-compose up -d postgres redis

# Verificar que estén corriendo
docker-compose ps

# Aplicar schema a la base de datos
pnpm db:push
```

### Opción B: Servicios Locales

Asegúrate de tener PostgreSQL y Redis instalados y corriendo localmente.

### Iniciar Aplicaciones

```bash
# Terminal 1: API
pnpm dev:api

# Terminal 2: Web
pnpm dev:web

# Terminal 3: Bot
pnpm dev:bot
```

O todos juntos:

```bash
pnpm dev
```

---

## 8. Probar el Bot

### Paso 8.1: Verificar API

```bash
curl http://localhost:3001/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T...",
  "version": "1.0.0"
}
```

### Paso 8.2: Probar Bot de Telegram

1. Abre Telegram
2. Busca tu bot por username
3. Envía `/start`
4. Deberías ver el mensaje de bienvenida

### Paso 8.3: Probar WebApp

1. Abre http://localhost:3000 en tu navegador
2. Deberías ver la pantalla de onboarding
3. Conecta tu wallet de pruebas

---

## 9. Despliegue en Producción

### Paso 9.1: Preparar Servidor

Requisitos del servidor:
- Ubuntu 22.04 LTS (recomendado)
- 2 GB RAM mínimo
- 20 GB disco
- Docker instalado

### Paso 9.2: Configurar SSL

```bash
# Instalar Certbot
sudo apt install certbot

# Obtener certificado
sudo certbot certonly --standalone -d tu-dominio.com
```

### Paso 9.3: Desplegar con Docker

```bash
# Clonar en servidor
git clone https://github.com/tu-usuario/polyarbitrage-bot.git
cd polyarbitrage-bot

# Configurar variables de producción
cp .env.example .env
nano .env  # Configurar para producción

# Build y deploy
docker-compose build
docker-compose up -d
```

### Paso 9.4: Configurar Nginx (Opcional)

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name tu-dominio.com;

    ssl_certificate /etc/letsencrypt/live/tu-dominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tu-dominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### Paso 9.5: Actualizar Bot con URL de WebApp

En BotFather:
```
/setmenubutton
```

Proporciona tu URL de producción: `https://tu-dominio.com`

---

## Checklist Final

Antes de lanzar, verifica:

- [ ] Bot de Telegram creado y configurado
- [ ] WalletConnect Project ID configurado
- [ ] Variables de entorno configuradas correctamente
- [ ] Base de datos funcionando
- [ ] API respondiendo en `/health`
- [ ] WebApp accesible
- [ ] Bot respondiendo a `/start`
- [ ] Wallet conecta correctamente
- [ ] SSL configurado (producción)
- [ ] Backups configurados (producción)
- [ ] Monitoreo configurado (producción)

---

## Solución de Problemas

### El bot no responde

```bash
# Verificar logs del bot
docker-compose logs bot
# o
pnpm dev:bot  # y ver errores en consola
```

### Error de conexión a base de datos

```bash
# Verificar que PostgreSQL está corriendo
docker-compose ps postgres

# Verificar conexión
docker-compose exec postgres psql -U polyarbitrage -c "SELECT 1"
```

### Wallet no conecta

- Verifica que WalletConnect Project ID es correcto
- Verifica que el dominio está en la lista de permitidos
- Prueba con otra wallet

### Errores de CORS

- Verifica que los dominios están en `CORS_ORIGINS`
- En desarrollo, asegúrate de usar `localhost`

---

## Siguientes Pasos

1. **Probar con capital pequeño** ($5-10) antes de escalar
2. **Monitorear** las primeras operaciones activamente
3. **Ajustar** umbrales según rendimiento
4. **Configurar alertas** para errores y eventos importantes

¡Buena suerte con tu bot de arbitraje! 🎯
