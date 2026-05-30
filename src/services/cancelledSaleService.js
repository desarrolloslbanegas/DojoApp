const db = require('../config/db');

function normalizeCancelledItems(items) {
  return items.map(item => {
    const cantidad = parseFloat((item.cantidad || item.qty || 0).toString().replace(',', '.')) || 0;
    const precioUnitario = parseFloat(item.precioUnitario || item.precio_unitario || item.price) || 0;

    return {
      idProducto: item.idProducto || item.id_producto || null,
      nombre: item.desc || item.nombre || item.producto || '',
      cantidad,
      precioUnitario,
      subtotal: parseFloat(item.subtotal) || Number((cantidad * precioUnitario).toFixed(2))
    };
  });
}

function registrarVentaCancelada(origen) {
  return (req, res) => {
    const { items, total, medioPago, cash, transfer, received, change, motivo } = req.body;
    const vendedorId = req.session.usuarioId || null;
    const vendedorNombre = req.session.usuarioNombre || null;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debe enviar al menos un producto para registrar la venta cancelada.' });
    }

    const normalizedItems = normalizeCancelledItems(items);
    const montoTotal = parseFloat(total) || normalizedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const cantidadItems = normalizedItems.reduce((sum, item) => sum + item.cantidad, 0);

    let efectivo = 0;
    let transferencia = 0;
    if (medioPago === 'efectivo') {
      efectivo = montoTotal;
    } else if (medioPago === 'transferencia') {
      transferencia = montoTotal;
    } else if (medioPago === 'mixto') {
      efectivo = parseFloat(cash) || 0;
      transferencia = parseFloat(transfer) || 0;
    }

    const insertQuery = `
      INSERT INTO ventas_canceladas
        (origen, monto_total, cantidad_items, medio_pago, efectivo, transferencia, efectivo_recibido, vuelto, items_json, motivo, fecha_hora, id_vendedor, vendedor_nombre)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)
    `;

    db.query(insertQuery, [
      origen,
      montoTotal,
      cantidadItems,
      medioPago || null,
      efectivo,
      transferencia,
      received != null ? parseFloat(received) || 0 : null,
      change != null ? parseFloat(change) || 0 : null,
      JSON.stringify(normalizedItems),
      motivo || 'VACIAR',
      vendedorId,
      vendedorNombre
    ], (err, result) => {
      if (err) {
        return res.status(500).json({ error: 'Error al registrar la venta cancelada.' });
      }

      res.json({ success: true, canceladaId: result.insertId });
    });
  };
}

module.exports = {
  registrarVentaCancelada
};
