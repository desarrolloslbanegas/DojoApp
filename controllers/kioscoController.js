const db = require('../src/config/db');
const { notifyLowStock, STOCK_ALERT_THRESHOLD } = require('../src/services/stockAlertService');
const PDFDocument = require('pdfkit');

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
        callback(null, cachedBarcodeField);
    });
}

const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

function formatDateParts(value) {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
        return { fecha: '-', dia: '-', hora: '-' };
    }

    const optionsDate = { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' };
    const fecha = date.toLocaleDateString('es-AR', optionsDate);
    const hora = date.toLocaleTimeString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    const dia = new Intl.DateTimeFormat('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long' }).format(date);
    return { fecha, dia, hora };
}

function formatDateForPDF(dateString) {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const shortYear = year.slice(-2);
    return `${day}/${month}/${shortYear}`;
}

exports.getKiosco = (req, res) => {
    const usuario = req.session.usuarioNombre || 'Usuario';
    const idPerfil = req.session.idPerfil;
    const esAdmin = idPerfil === 1;
    const hasKiosco = [1, 2, 4].includes(idPerfil);
    const hasPanaderia = [1, 3, 4].includes(idPerfil);

    const renderKiosco = (payload) => res.render('kiosco', {
        title: 'Ventas Kiosco',
        usuario,
        idPerfil,
        esAdmin,
        hasKiosco,
        hasPanaderia,
        basePath: '/kiosco',
        ...payload
    });
    
    const query = 'SELECT id_producto, nombre, precio_venta, stock FROM producto';

    db.query(query, (err, results) => {
        if (err) {
            // Si hay error, mandamos la lista vacía para que no explote el EJS
            return renderKiosco({ error: 'Error al cargar productos', products: [] });
        }

        // console.log(JSON.stringify(results) + " Productos")

        // Pasamos "results" como "products"
        renderKiosco({ error: null, products: results });
    });
};

// Si vas a buscar por nombre o código mediante AJAX (opcional, si no usás el datalist)
exports.buscarProductoPorNombre = (req, res) => {


    const { nombre } = req.params;
    
    findBarcodeField((err, barcodeField) => {
        if (err) return res.status(500).json({ error: 'Error de DB' });

        let query = 'SELECT * FROM producto WHERE nombre LIKE ?';
        const params = [`%${nombre}%`];

        if (barcodeField) {
            query += ` OR ${db.escapeId(barcodeField)} = ?`;
            params.push(nombre);
        }

        db.query(query, params, (err, results) => {
            if (err) return res.status(500).json({ error: 'Error de DB' });
            if (results.length > 0) {

                console.log(results)
                res.json(results);
            } else {
                res.status(404).json({ error: 'Producto no encontrado' });
            }
        });
    });
};

exports.getHistorialVentas = (req, res) => {
    const usuario = req.session.usuarioNombre || 'Usuario';
    const selectedFecha = req.query.fecha || '';
    const selectedFechaInicio = req.query.fechaInicio || '';
    const selectedFechaFin = req.query.fechaFin || '';
    const selectedMes = req.query.mes || '';
    const selectedVendedor = req.query.vendedor || '';
    const selectedItem = req.query.item || '';
    const selectedFilter = req.query.filtro || (selectedFechaInicio || selectedFechaFin ? 'periodo' : selectedFecha ? 'dia' : selectedMes ? 'mes' : 'periodo');

    const vendedoresQuery = 'SELECT id_usuario, nombre FROM usuario WHERE id_perfil IN (1,2) ORDER BY nombre';
    db.query(vendedoresQuery, (err, vendedores) => {
        if (err) {
            return res.render('historialVentas', {
                title: 'Historial de Ventas',
                usuario,
                ventas: [],
                vendedores: [],
                selectedFecha,
                selectedFechaInicio,
                selectedFechaFin,
                selectedMes,
                selectedVendedor,
                selectedFilter,
                resumen: { total: 0, ganancia: 0 }
            });
        }

        const whereClauses = [];
        const params = [];

        if (selectedFechaInicio && selectedFechaFin) {
            whereClauses.push('DATE(v.fecha_hora) BETWEEN ? AND ?');
            params.push(selectedFechaInicio, selectedFechaFin);
        } else if (selectedFechaInicio) {
            whereClauses.push('DATE(v.fecha_hora) >= ?');
            params.push(selectedFechaInicio);
        } else if (selectedFechaFin) {
            whereClauses.push('DATE(v.fecha_hora) <= ?');
            params.push(selectedFechaFin);
        } else if (selectedFecha) {
            whereClauses.push('DATE(v.fecha_hora) = ?');
            params.push(selectedFecha);
        }

        if (selectedMes) {
            whereClauses.push("DATE_FORMAT(v.fecha_hora, '%Y-%m') = ?");
            params.push(selectedMes);
        }

        if (selectedVendedor) {
            whereClauses.push('v.id_vendedor = ?');
            params.push(selectedVendedor);
        }

        if (selectedItem) {
            whereClauses.push('p.nombre LIKE ?');
            params.push(`%${selectedItem}%`);
        }

        const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const query = `SELECT v.id_venta, v.monto_total, v.efectivo, v.transferencia, v.fecha_hora, u.nombre AS vendedor,
            dv.cantidad, dv.precio_unitario, p.precio_costo, p.nombre AS producto
            FROM venta v
            JOIN usuario u ON u.id_usuario = v.id_vendedor
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN producto p ON p.id_producto = dv.id_producto
            ${whereSql}
            ORDER BY v.fecha_hora DESC`;

        db.query(query, params, (err, results) => {
            if (err) {
                return res.render('historialVentas', {
                    title: 'Historial de Ventas',
                    usuario,
                    ventas: [],
                    vendedores,
                    selectedFecha,
                    selectedFechaInicio,
                    selectedFechaFin,
                    selectedMes,
                    selectedVendedor,
                    selectedItem,
                    selectedFilter,
                    resumen: { total: 0, ganancia: 0 }
                });
            }

            const ventasMap = {};
            results.forEach(row => {
                if (!ventasMap[row.id_venta]) {
                    const { fecha, dia, hora } = formatDateParts(row.fecha_hora);
                    ventasMap[row.id_venta] = {
                        id: row.id_venta,
                        monto_total: parseFloat(row.monto_total),
                        efectivo: parseFloat(row.efectivo) || 0,
                        transferencia: parseFloat(row.transferencia) || 0,
                        fecha,
                        dia,
                        hora,
                        vendedor: row.vendedor,
                        items: [],
                        ganancia: 0
                    };
                }

                const cantidad = parseInt(row.cantidad, 10);
                const precioUnitario = parseFloat(row.precio_unitario);
                const precioCosto = parseFloat(row.precio_costo || 0);
                const gananciaItem = (precioUnitario - precioCosto) * cantidad;

                const venta = ventasMap[row.id_venta];
                const existingItem = venta.items.find(item => item.producto === row.producto);
                if (existingItem) {
                    existingItem.cantidad += cantidad;
                    existingItem.subtotal += precioUnitario * cantidad;
                } else {
                    venta.items.push({
                        producto: row.producto,
                        cantidad,
                        precio_unitario: precioUnitario,
                        subtotal: precioUnitario * cantidad
                    });
                }
                ventasMap[row.id_venta].ganancia += gananciaItem;
            });

            const ventas = Object.values(ventasMap);
            const resumen = ventas.reduce((acc, venta) => {
                acc.total += venta.monto_total;
                acc.efectivo += venta.efectivo;
                acc.transferencia += venta.transferencia;
                acc.ganancia += venta.ganancia;
                return acc;
            }, { total: 0, efectivo: 0, transferencia: 0, ganancia: 0 });

            res.render('historialVentas', {
                title: 'Historial de Ventas',
                usuario,
                ventas,
                vendedores,
                selectedFecha,
                selectedFechaInicio,
                selectedFechaFin,
                selectedMes,
                selectedVendedor,
                selectedItem,
                selectedFilter,
                resumen
            });
        });
    });
};

exports.exportHistorialPDF = (req, res) => {
    const selectedFecha = req.query.fecha || '';
    const selectedFechaInicio = req.query.fechaInicio || '';
    const selectedFechaFin = req.query.fechaFin || '';
    const selectedMes = req.query.mes || '';
    const selectedVendedor = req.query.vendedor || '';
    const selectedItem = req.query.item || '';

    let vendedorName = '';
    if (selectedVendedor) {
        const getVendedorQuery = 'SELECT nombre FROM usuario WHERE id_usuario = ?';
        db.query(getVendedorQuery, [selectedVendedor], (err, result) => {
            if (err) {
                return res.status(500).send('Error al obtener nombre del vendedor');
            }
            vendedorName = result.length > 0 ? result[0].nombre : selectedVendedor;
            generatePDF();
        });
    } else {
        generatePDF();
    }

    function generatePDF() {
        const whereClauses = [];
        const params = [];

        if (selectedFechaInicio && selectedFechaFin) {
            whereClauses.push('DATE(v.fecha_hora) BETWEEN ? AND ?');
            params.push(selectedFechaInicio, selectedFechaFin);
        } else if (selectedFechaInicio) {
            whereClauses.push('DATE(v.fecha_hora) >= ?');
            params.push(selectedFechaInicio);
        } else if (selectedFechaFin) {
            whereClauses.push('DATE(v.fecha_hora) <= ?');
            params.push(selectedFechaFin);
        } else if (selectedFecha) {
            whereClauses.push('DATE(v.fecha_hora) = ?');
            params.push(selectedFecha);
        }

        if (selectedMes) {
            whereClauses.push("DATE_FORMAT(v.fecha_hora, '%Y-%m') = ?");
            params.push(selectedMes);
        }

        if (selectedVendedor) {
            whereClauses.push('v.id_vendedor = ?');
            params.push(selectedVendedor);
        }

        if (selectedItem) {
            whereClauses.push('p.nombre LIKE ?');
            params.push(`%${selectedItem}%`);
        }

        const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
        const query = `SELECT v.id_venta, v.monto_total, v.efectivo, v.transferencia, v.fecha_hora, u.nombre AS vendedor,
            dv.cantidad, dv.precio_unitario, p.precio_costo, p.nombre AS producto
            FROM venta v
            JOIN usuario u ON u.id_usuario = v.id_vendedor
            JOIN detalle_venta dv ON dv.id_venta = v.id_venta
            JOIN producto p ON p.id_producto = dv.id_producto
            ${whereSql}
            ORDER BY v.fecha_hora DESC`;

        db.query(query, params, (err, results) => {
            if (err) {
                return res.status(500).send('Error al generar PDF');
            }

            const ventasMap = {};
            results.forEach(row => {
                if (!ventasMap[row.id_venta]) {
                    const { fecha, dia, hora } = formatDateParts(row.fecha_hora);
                    ventasMap[row.id_venta] = {
                        id: row.id_venta,
                        monto_total: parseFloat(row.monto_total),
                        efectivo: parseFloat(row.efectivo) || 0,
                        transferencia: parseFloat(row.transferencia) || 0,
                        fecha,
                        dia,
                        hora,
                        vendedor: row.vendedor,
                        items: [],
                        ganancia: 0
                    };
                }

                const cantidad = parseInt(row.cantidad, 10);
                const precioUnitario = parseFloat(row.precio_unitario);
                const precioCosto = parseFloat(row.precio_costo || 0);
                const gananciaItem = (precioUnitario - precioCosto) * cantidad;

                const venta = ventasMap[row.id_venta];
                const existingItem = venta.items.find(item => item.producto === row.producto);
                if (existingItem) {
                    existingItem.cantidad += cantidad;
                    existingItem.subtotal += precioUnitario * cantidad;
                } else {
                    venta.items.push({
                        producto: row.producto,
                        cantidad,
                        precio_unitario: precioUnitario,
                        subtotal: precioUnitario * cantidad
                    });
                }
                ventasMap[row.id_venta].ganancia += gananciaItem;
            });

            const ventas = Object.values(ventasMap);
            const resumen = ventas.reduce((acc, venta) => {
                acc.total += venta.monto_total;
                acc.efectivo += venta.efectivo;
                acc.transferencia += venta.transferencia;
                acc.ganancia += venta.ganancia;
                return acc;
            }, { total: 0, efectivo: 0, transferencia: 0, ganancia: 0 });

            const doc = new PDFDocument({ 
                size: 'A4', 
                layout: 'portrait', 
                margins: { top: 35, bottom: 35, left: 35, right: 50 }
            });
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="historial-ventas.pdf"');
            doc.pipe(res);

            doc.font('Helvetica-Bold').fontSize(18).fillColor('#000').text('Historial de Ventas', { align: 'center' });
            doc.moveDown(0.5);

            const vendedorLine = selectedVendedor ? `Vendedor: ${vendedorName}` : 'Vendedor: Todos';
            let periodoText = 'Periodo: Todos los periodos';
            if (selectedFechaInicio && selectedFechaFin) {
                periodoText = `Periodo: ${formatDateForPDF(selectedFechaInicio)} al ${formatDateForPDF(selectedFechaFin)}`;
            } else if (selectedFechaInicio) {
                periodoText = `Periodo desde: ${formatDateForPDF(selectedFechaInicio)}`;
            } else if (selectedFechaFin) {
                periodoText = `Periodo hasta: ${formatDateForPDF(selectedFechaFin)}`;
            } else if (selectedFecha) {
                periodoText = `Periodo: ${formatDateForPDF(selectedFecha)}`;
            } else if (selectedMes) {
                const [year, month] = selectedMes.split('-');
                periodoText = `Periodo: ${month}/${year.slice(-2)}`;
            }

            doc.font('Helvetica').fontSize(11).fillColor('#000').text(vendedorLine, { align: 'left' });
            doc.text(periodoText, { align: 'left' });
            doc.moveDown(1);

            const stats = [
                { label: 'Total de registros', value: ventas.length },
                { label: 'Total ventas', value: `$${resumen.total.toFixed(2)}` },
                { label: 'Efectivo', value: `$${resumen.efectivo.toFixed(2)}` },
                { label: 'Transferencia', value: `$${resumen.transferencia.toFixed(2)}` },
                { label: 'Ganancia total', value: `$${resumen.ganancia.toFixed(2)}` }
            ];

            doc.font('Helvetica-Bold').fontSize(10).fillColor('#000');
            stats.forEach(stat => {
                doc.text(`${stat.label}: `, { continued: true });
                doc.font('Helvetica').text(stat.value);
                doc.font('Helvetica-Bold');
            });
            doc.moveDown(1);

            const marginLeft = doc.page.margins.left;
            const colWidths = [35, 50, 40, 110, 45, 45, 55, 45, 60];
            const tableWidth = colWidths.reduce((sum, width) => sum + width, 0);
            const headers = ['Venta', 'Fecha', 'Hora', 'Vendedor', 'Total', 'Efectivo', 'Transferencia', 'Ganancia', 'Items'];

            const drawHeader = () => {
                doc.font('Helvetica-Bold').fontSize(9).fillColor('#000');
                let x = marginLeft;
                const yHeader = doc.y;
                headers.forEach((header, i) => {
                    doc.text(header, x, yHeader, { width: colWidths[i], align: 'left' });
                    x += colWidths[i];
                });
                doc.moveDown(1);
                doc.strokeColor('#000').lineWidth(0.5).moveTo(marginLeft, doc.y).lineTo(marginLeft + tableWidth, doc.y).stroke();
                doc.moveDown(0.2);
            };

            drawHeader();
            let y = doc.y;
            doc.font('Helvetica').fontSize(9).fillColor('#000');

            ventas.forEach((venta, index) => {
                const row = [
                    `#${venta.id}`,
                    venta.fecha,
                    venta.hora,
                    venta.vendedor,
                    `$${venta.monto_total.toFixed(2)}`,
                    `$${venta.efectivo.toFixed(2)}`,
                    `$${venta.transferencia.toFixed(2)}`,
                    `$${venta.ganancia.toFixed(2)}`,
                    venta.items.map(item => `${item.producto} x${item.cantidad}`).join(', ')
                ];

                const rowHeights = row.map((cell, i) => doc.heightOfString(cell, { width: colWidths[i] - 4 }));
                const rowHeight = Math.max(...rowHeights) + 10;

                if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
                    doc.addPage({ size: 'A4', layout: 'portrait', margin: 40 });
                    drawHeader();
                    y = doc.y;
                    doc.font('Helvetica').fontSize(9).fillColor('#000');
                }

                if (index % 2 === 0) {
                    doc.fillColor('#f2f2f2').rect(marginLeft, y - 2, tableWidth, rowHeight).fill();
                    doc.fillColor('#000');
                }

                let x = marginLeft;
                row.forEach((cell, i) => {
                    doc.text(cell, x, y, { width: colWidths[i] - 4, align: 'left' });
                    x += colWidths[i];
                });

                y += rowHeight;
            });

            doc.end();
        });
    }
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

    // Determinar efectivo y transferencia según medioPago
    let efectivoValue = 0;
    let transferenciaValue = 0;

    if (medioPago === 'efectivo') {
        efectivoValue =  montoTotal;
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
        const cantidad = parseInt(item.cantidad || item.qty, 10);
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

        const selectStockQuery = `SELECT id_producto, nombre, stock FROM producto WHERE id_producto IN (${productoIds.map(() => '?').join(', ')}) FOR UPDATE`;
        db.query(selectStockQuery, productoIds, (err, productos) => {
            if (err) {
                return db.rollback(() => res.status(500).json({ error: 'Error al verificar stock' }));
            }

            if (productos.length !== productoIds.length) {
                return db.rollback(() => res.status(400).json({ error: 'Uno o más productos no existen.' }));
            }

            const lowStockProducts = productos.map(producto => {
                const actualStock = parseInt(producto.stock, 10) || 0;
                const requerido = stockRequerido[producto.id_producto] || 0;

                console.log("Actual stock" + actualStock)

                console.log("REQUERIDO " + requerido)



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

                    const updatePlaceholders = [];
                    const updateValues = [];
                    const updates = [];

                    for (const productoId of productoIds) {
                        const cantidad = stockRequerido[productoId];
                        updates.push('UPDATE producto SET stock = stock - ? WHERE id_producto = ?');
                        updateValues.push(cantidad, productoId);
                    }

                    const runStockUpdates = (index) => {
                        if (index >= updates.length) {
                            // Después de actualizar, consultar el stock ACTUAL de cada producto
                            const selectActualStock = `SELECT id_producto, nombre, stock FROM producto WHERE id_producto IN (${productoIds.map(() => '?').join(', ')})`;
                            
                            db.query(selectActualStock, productoIds, (err, productosActualizados) => {
                                if (err) {
                                    return db.commit(err => {
                                        sendLowStockAlerts(lowStockProducts);
                                        res.json({ success: true, ventaId });
                                    });
                                }

                                // Reconstruir los productos con el stock ACTUAL de la BD
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

function sendLowStockAlerts(lowStockProducts) {

    console.log(lowStockProducts)

        console.log(lowStockProducts.length + " LENGTH")


    if (lowStockProducts.length === 0) return;

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
