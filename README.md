# DojoApp - Sistema de Gestión Kiosco y Panadería

## 📋 Descripción
Sistema web para gestión de ventas en kiosco y panadería con control de usuarios y perfiles.

## 🚀 Inicio Rápido

### Desarrollo Local (Sin Base de Datos)
```bash
npm install
npm run dev
```

Accede a `http://localhost:3000`
- **Usuario**: Cualquier nombre (ej: admin)
- **Contraseña**: Cualquier contraseña
- Inicia sesión como administrador con datos mock

### Desarrollo con Base de Datos
1. Editar `.env`:
```env
USE_MOCK_DATA=false
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=sistema_kiosco_panaderia
```

2. Ejecutar:
```bash
npm install
npm start
```

## 📚 Estructura del Proyecto
```
DojoApp/
├── controllers/          # Lógica de negocio
├── routes/              # Definición de rutas
├── views/               # Plantillas EJS
├── src/
│   ├── config/          # Configuración de BD
│   └── data/            # Datos mock
├── index.js             # Archivo principal
├── package.json         # Dependencias
├── .env                 # Variables de entorno
└── .env.example         # Ejemplo de .env
```

## 🔐 Sistema de Perfiles

### Administrador (id_perfil = 1)
- Acceso a: Kiosco, Panadería, Stock, Gestión de Usuarios
- Permisos completos

### Vendedor (id_perfil = 2)
- Acceso a: Kiosco, Panadería
- Permisos limitados a ventas

## 🌐 Despliegue en Render.com

### Pasos de Despliegue:

1. **Conectar repositorio Git**
   - Subir el proyecto a GitHub
   - Conectar la rama a Render.com

2. **Configurar Variables de Entorno en Render**
   - En el dashboard de Render, ir a "Environment"
   - Agregar variables:
   ```
   NODE_ENV=production
   PORT=3000
   USE_MOCK_DATA=true
   ```

3. **Build Command**
   ```
   npm install
   ```

4. **Start Command**
   ```
   npm start
   ```

5. **Node Version**
   - Render usará automáticamente la versión de `engines` en package.json

## 📦 Dependencias

- **express**: Framework web
- **ejs**: Motor de plantillas
- **express-session**: Manejo de sesiones
- **mysql2**: Conexión a BD MySQL
- **dotenv**: Gestión de variables de entorno

## 🧪 Pruebas

### Modo Mock Data (Desarrollo)
- Login sin validación de BD
- Tabla de productos de ejemplo cargada automáticamente
- Perfecto para demostraciones

### Modo Producción
- Login con validación de BD
- Productos desde base de datos
- Todas las funcionalidades activas

## ⚙️ Variables de Entorno

| Variable | Descripción | Valores |
|----------|-------------|---------|
| NODE_ENV | Ambiente | development, production |
| PORT | Puerto del servidor | 3000 (default) |
| USE_MOCK_DATA | Usar datos mock | true, false |
| DB_HOST | Host de BD | localhost |
| DB_USER | Usuario BD | root |
| DB_PASSWORD | Contraseña BD | tu_contraseña |
| DB_NAME | Nombre BD | sistema_kiosco_panaderia |

## 📝 Notas

- En desarrollo con `USE_MOCK_DATA=true`, no es necesaria conexión a BD
- Los datos mock incluyen 10 productos de ejemplo
- El usuario por defecto en modo demo es Administrador
- Todos los middleware de autenticación funcionan normalmente

## 👨‍💻 Autor
Desarrollado por equipo DojoApp

## 📄 Licencia
ISC
