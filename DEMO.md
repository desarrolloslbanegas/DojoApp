# 🚀 Guía de Uso - Modo Demo (sin Base de Datos)

## Inicio Rápido

Actualmente el proyecto está configurado en **MODO DESARROLLO** con datos mock. No necesitas una base de datos para probar.

### Cómo Ejecutar

```bash
# En la carpeta del proyecto
npm start
```

El servidor se ejecutará en `http://localhost:3000`

---

## 🔐 Login

**Importante**: En modo demo, el login funciona **sin validar contraseña**. Solo escribe cualquier nombre de usuario.

```
Usuario: admin (o cualquier nombre)
Contraseña: cualquier cosa
```

✅ **Resultado**: Inicia sesión como Administrador automáticamente

---

## 📋 Secciones Disponibles

### 1️⃣ Menú Principal
Después del login, verás 4 opciones:
- 🛒 **Kiosco** - Venta con tabla de productos (DISPONIBLE)
- 🍞 **Panadería** - En desarrollo
- 📦 **Stock** - En desarrollo (solo para Admin)
- 👥 **Gestión de Usuarios** - En desarrollo (solo para Admin)

### 2️⃣ Módulo Kiosco (FUNCIONAL)

**Tabla de Productos Disponibles:**
```
1. Pan Integral - $50
2. Pan Francés - $45
3. Medialunas - $30
4. Bizcochos - $25
5. Torta Chocolate - $200
6. Facturas Variadas - $35
7. Alfajores - $40
8. Brownies - $60
9. Galletitas - $20
10. Donas - $50
```

**Cómo usar:**
1. Click en el campo de búsqueda
2. Escribe el nombre del producto (ej: "Pan")
3. Selecciona de la lista
4. Ingresa cantidad
5. Click en "Agregar al Carrito"
6. El carrito se actualiza a la derecha
7. Selecciona método de pago
8. Click en "Confirmar Venta"

---

## 📊 Datos Mock Incluidos

### Productos
- **Total**: 10 productos de ejemplo
- **Archivo**: `src/data/mockData.js`
- **Formato**: Array de objetos con id, nombre, precio_venta

### Usuarios
- **Usuario por defecto**: Cualquier nombre
- **Perfil**: Administrador (en demo)
- **Sin validación de contraseña**

---

## ⚙️ Cambiar a Modo Producción (con BD)

Si deseas usar base de datos real:

1. **Editar `.env`:**
```env
USE_MOCK_DATA=false
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña
DB_NAME=sistema_kiosco_panaderia
```

2. **Reiniciar servidor:**
```bash
npm restart
```

⚠️ **Nota**: Necesitarás tener MySQL instalado y la BD creada.

---

## 🧭 Estructura de Carpetas

```
DojoApp/
├── controllers/
│   ├── kioscoController.js        ← Lógica de kiosco (con mock data)
│   ├── authController.js          ← Login sin BD
│   └── ...
├── views/
│   ├── kiosco.ejs                 ← Tabla de productos
│   ├── menuPrincipal.ejs          ← Menú principal
│   └── ...
├── src/
│   └── data/
│       └── mockData.js            ← Datos de productos mock
├── .env                           ← Variables de entorno
├── package.json
└── index.js                       ← Servidor principal
```

---

## 🔧 Variables de Entorno

**`.env` Actual (Desarrollo):**
```env
NODE_ENV=development
PORT=3000
USE_MOCK_DATA=true
```

**Cambiar `USE_MOCK_DATA`:**
- `true` = Modo demo, datos mock, sin BD
- `false` = Modo producción, datos de BD real

---

## 🐛 Verificación de Funcionamiento

### ✅ Checklist de Funcionalidades

- [ ] Login sin validación ✓
- [ ] Menú principal con opciones según perfil ✓
- [ ] Tabla de 10 productos en Kiosco ✓
- [ ] Búsqueda de productos ✓
- [ ] Agregar productos al carrito ✓
- [ ] Calcular total automático ✓
- [ ] Cierre de sesión ✓
- [ ] Redirección a login cuando expire sesión ✓

---

## 🌐 Despliegue en Render.com

Cuando estés listo para publicar:

1. Commit y push a GitHub:
```bash
git add .
git commit -m "Versión para Render"
git push origin main
```

2. En Render.com:
   - Conectar tu repositorio
   - Build: `npm install`
   - Start: `npm start`
   - Variables:
     - `NODE_ENV=production`
     - `USE_MOCK_DATA=true` (para demo)

3. Deploy automático activado ✓

---

## 💡 Próximos Pasos Sugeridos

1. **Mejorar UI de tabla de productos**
2. **Agregar más datos mock para otros módulos**
3. **Integrar realmente con BD cuando esté lista**
4. **Agregar más opciones de productos**
5. **Mejorar experiencia de usuario en carrito**

---

## 📞 Soporte

Si hay errores:
1. Verifica que `USE_MOCK_DATA=true` en `.env`
2. Revisa que `npm start` inicie correctamente
3. Abre la consola de desarrollador (F12) para ver errores JS
4. Reinicia el servidor

---

**¡Lista para probar! 🎉**
