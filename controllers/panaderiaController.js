const db = require('../src/config/db');
const { notifyLowStock } = require('../src/services/stockAlertService');
const { registrarVentaCancelada } = require('../src/services/cancelledSaleService');

const barcodeCandidates = ['codigo_barras', 'codigo_barra', 'codigo', 'barcode', 'ean', 'gtin', 'upc'];
let cachedBarcodeField = null;

function findBarcodeField(callback) {
  if (cachedBarcodeField !== null) {
    return callback(null, cachedBarcodeField);
  }

  db.query('SHOW COLUMNS FROM producto', (err, columns) => {
    if (err) {
      return callback(err);
    }

    const columnNames = columns.map(c => c.Field.toLowerCase());
    cachedBarcodeField = barcodeCandidates.find(col => columnNames.includes(col)) || false;
    callback(None, cachedBarcodeField);
  });
}

function sendLowStockAlerts(lowStockProducts) {
  if (!Array.isArray(lowStockProducts) || lowStockProducts.length === 0) return;

  notifyLowStock(lowStockProducts)
    .then(sent => {
      if (!sent) {
        console.error('No se pudo enviar la alerta de stock bajo.');
      }
    })
    .catch(err => {
      console.error('Error en la alerta de stock bajo:', err);
    });
}

exports.getPanaderia = (req, res) => {
  const usuario = req.session.usuarioNombre || 'Usuario';
  const idPerfil = req.session.idPerfil;
  const esAdmin = idPerfil === 1;
  const hasKiosco = [1, 2, 4].includes(idPerfil);
  const hasPanaderia = [1, 3, 4].includes(idPerfil);

  const renderPanaderia = (payload) => res.render('kiosco', {
    title: 'Ventas Panadería',
    usuario,
    idPerfil,
    esAdmin,
    hasKiosco,
    hasPanaderia,
    basePath: '/panaderia',
    ...payload
  });

  const query = 'SELECT id_producto, nombre, precio_venta, stock FROM producto WHERE id_tipo_producto = 1';

  db.query(query, (err, results) => {
    if (err) {
      return renderPanaderia({ error: 'Error al cargar productos', products: [] });
    }

    renderPanaderia({ error: null, products: results });
  });
};

exports.buscarProductoPorNombre = (req, res) => {
  const { nombre } = req.params;

  findBarcodeField((err, barcodeField) => {
    if (err) return res.status(500).json({ error: 'Error de DB' });

    let query = 'SELECT * FROM producto WHERE id_tipo_producto = 1 AND (nombre LIKE ?';
    const params = [`%${nombre}%`];

    if (barcodeField) {
      query += ` OR ${db.escapeId(barcodeField)} = ?`;
      params.push(nombre);
    }

    query += ')';

    db.query(query, params, (err, results) => {
      if (err) return res.status(500).json({ error: 'Error de DB' });
      if (results.length > 0) {
        res.json(results);
      } else {
        res.status(404).json({ error: 'Producto no encontrado' });
      }
    });
  });
};

exports.registrarVenta = (req, res) => {
  const { items, total, medioPago, cash, transfer, received } = req.body;
  const vendedorId = req.session.usuarioId || null;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Debe enviar al menos un producto en la venta.' });
  }

  const montoTotal = parseFloat(total);
  if (isNaN(montoTotal) || montoTotal <= 0) {
    return res.status(400).json({ error: 'Total inválido.' });
  }

  let efectivoValue = 0;
  let transferenciaValue = 0;

  if (medioPago === 'efectivo') {
    efectivoValue = montoTotal;
    transferenciaValue = 0;
  } else if (medioPago === 'transferencia') {
    efectivoValue = 0;
    transferenciaValue = montoTotal;
  } else if (medioPago === 'mixto') {
    efectivoValue = parseFloat(cash) || 0;
    transferenciaValue = parseFloat(transfer) || 0;
  }

  if (!vendedorId) {
    return res.status(403).json({ error: 'Usuario no autenticado.' });
  }

  const ventaItems = [];
  const stockRequerido = {};

  for (const item of items) {
    const productoId = parseInt(item.idProducto || item.id_producto || item.id, 10);
    const cantidad = parseFloat((item.cantidad || item.qty || '').toString().replace(',', '.'));
    const precioUnitario = parseFloat(item.precioUnitario || item.precio_unitario || item.price);

    if (!productoId || isNaN(cantidad) || cantidad <= 0 || isNaN(precioUnitario) || precioUnitario < 0) {
      return res.status(400).json({ error: 'Datos de producto inválidos.' });
    }

    ventaItems.push({ productoId, cantidad, precioUnitario });
    stockRequerido[productoId] = (stockRequerido[productoId] || 0) + cantidad;
  }

  const productoIds = Object.keys(stockRequerido).map(id => parseInt(id, 10));

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: 'Error de DB' });

    const selectStockQuery = `SELECT id_producto, nombre, stock FROM producto WHERE id_producto IN (${productoIds.map(() => '?').join(', ')}) AND id_tipo_producto = 1 FOR UPDATE`;
    db.query(selectStockQuery, productoIds, (err, productos) => {
      if (err) {
        return db.rollback(() => res.status(500).json({ error: 'Error al verificar stock' }));
      }

      if (productos.length !== productoIds.length) {
        return db.rollback(() => res.status(400).json({ error: 'Uno o más productos no existen o no pertenecen a panadería.' }));
      }

      const lowStockProducts = productos.map(producto => {
        const actualStock = parseInt(producto.stock, 10) || 0;
        const requerido = stockRequerido[producto.id_producto] || 0;
        return {
          id_producto: producto.id_producto,
          nombre: producto.nombre,
          stock_restante: actualStock - requerido
        };
      }).filter(item => item.stock_restante < 0);

      const insertVenta = 'INSERT INTO venta (monto_total, efectivo, transferencia, fecha_hora, id_vendedor) VALUES (?, ?, ?, NOW(), ?)';
      db.query(insertVenta, [montoTotal, efectivoValue, transferenciaValue, vendedorId], (err, result) => {
        if (err) {
          return db.rollback(() => res.status(500).json({ error: 'Error al registrar venta' }));
        }

        const ventaId = result.insertId;
        const detalleValues = [];
        const detallePlaceholders = [];

        for (const item of ventaItems) {
          detallePlaceholders.push('(?, ?, ?, ?)');
          detalleValues.push(ventaId, item.productoId, item.cantidad, item.precioUnitario);
        }

        const insertDetalle = `INSERT INTO detalle_venta (id_venta, id_producto, cantidad, precio_unitario) VALUES ${detallePlaceholders.join(', ')}`;
        db.query(insertDetalle, detalleValues, (err) => {
          if (err) {
            return db.rollback(() => res.status(500).json({ error: 'Error al registrar detalle de venta' }));
          }

          const updates = [];
          const updateValues = [];
          for (const productoId of productoIds) {
            const cantidad = stockRequerido[productoId];
            updates.push('UPDATE producto SET stock = stock - ? WHERE id_producto = ?');
            updateValues.push(cantidad, productoId);
          }

          const runStockUpdates = (index) => {
            if (index >= updates.length) {
              const selectActualStock = `SELECT id_producto, nombre, stock FROM producto WHERE id_producto IN (${productoIds.map(() => '?').join(', ')})`;
              db.query(selectActualStock, productoIds, (err, productosActualizados) => {
                if (err) {
                  return db.commit(err => {
                    sendLowStockAlerts(lowStockProducts);
                    res.json({ success: true, ventaId });
                  });
                }

                const lowStockProductsActual = productosActualizados
                  .map(producto => ({
                    id_producto: producto.id_producto,
                    nombre: producto.nombre,
                    stock_restante: parseInt(producto.stock, 10) || 0
                  }))
                  .filter(item => item.stock_restante < 0);

                return db.commit(err => {
                  if (err) {
                    return db.rollback(() => res.status(500).json({ error: 'Error al confirmar venta' }));
                  }
                  sendLowStockAlerts(lowStockProductsActual);
                  res.json({ success: true, ventaId });
                });
              });
            } else {
              db.query(updates[index], [updateValues[index * 2], updateValues[index * 2 + 1]], (err) => {
                if (err) {
                  return db.rollback(() => res.status(500).json({ error: 'Error al actualizar stock' }));
                }
                runStockUpdates(index + 1);
              });
            }
          };

          runStockUpdates(0);
        });
      });
    });
  });
};

exports.registrarVentaCancelada = registrarVentaCancelada('panaderia');
