const db = require('../src/config/db');

exports.getStock = (req, res) => {
    const mensaje = req.query.mensaje || '';
    const tipoMensaje = req.query.tipo || 'info';

    const productosQuery = `SELECT p.id_producto, p.nombre, p.codigo_barras, p.precio_costo, p.precio_venta, p.stock, p.id_tipo_producto, p.idCategoria, tp.descripcion AS tipo, c.nombre AS categoria
        FROM producto p
        LEFT JOIN tipo_producto tp ON tp.id_tipo_producto = p.id_tipo_producto
        LEFT JOIN categoria c ON c.ID = p.idCategoria
        ORDER BY p.nombre`;
    const tiposQuery = 'SELECT id_tipo_producto, descripcion FROM tipo_producto ORDER BY descripcion';
    const categoriasQuery = 'SELECT ID, nombre FROM categoria ORDER BY nombre';

    db.query(productosQuery, (err, productos) => {
        if (err) {
            return res.render('stock', {
                title: 'Stock',
                products: [],
                tipos: [],
                categorias: [],
                mensaje: 'Error al cargar productos.',
                tipoMensaje: 'error'
            });
        }

        const normalizedProductos = productos.map(producto => ({
            ...producto,
            precio_costo: Number(producto.precio_costo || 0),
            precio_venta: Number(producto.precio_venta || 0),
            stock: parseInt(producto.stock, 10) || 0
        }));

        db.query(tiposQuery, (err, tipos) => {
            if (err) {
                tipos = [];
            }

            db.query(categoriasQuery, (err, categorias) => {
                if (err) {
                    categorias = [];
                }

                res.render('stock', {
                    title: 'Stock',
                    products: normalizedProductos,
                    tipos,
                    categorias,
                    mensaje,
                    tipoMensaje
                });
            });
        });
    });
};

exports.guardarProducto = (req, res) => {
    const {
        accion,
        id_producto,
        nombre,
        codigo_barras,
        precio_costo,
        precio_venta,
        stock,
        id_tipo_producto,
        id_categoria,
        id_categoria_gestion,
        categoria_nombre,
        cantidad_a_agregar
    } = req.body;

    if (accion === 'categoria_nueva') {
        const nombreCategoria = (categoria_nombre || '').trim();
        if (!nombreCategoria) {
            return res.redirect('/stock?mensaje=' + encodeURIComponent('Ingrese el nombre de la categoría.') + '&tipo=error');
        }

        const checkDuplicateQuery = 'SELECT ID FROM categoria WHERE nombre = ?';
        db.query(checkDuplicateQuery, [nombreCategoria], (err, results) => {
            if (err) {
                return res.redirect('/stock?mensaje=' + encodeURIComponent('Error al validar la categoría.') + '&tipo=error');
            }

            if (results.length > 0) {
                return res.redirect('/stock?mensaje=' + encodeURIComponent('La categoría ya existe.') + '&tipo=error');
            }

            db.query('INSERT INTO categoria (nombre) VALUES (?)', [nombreCategoria], (err) => {
                if (err) {
                    return res.redirect('/stock?mensaje=' + encodeURIComponent('Error al crear la categoría.') + '&tipo=error');
                }
                res.redirect('/stock?mensaje=' + encodeURIComponent('Categoría creada correctamente.') + '&tipo=success');
            });
        });
        return;
    }

    if (accion === 'categoria_editar') {
        const nombreCategoria = (categoria_nombre || '').trim();
        if (!id_categoria_gestion || !nombreCategoria) {
            return res.redirect('/stock?mensaje=' + encodeURIComponent('Complete los datos para editar la categoría.') + '&tipo=error');
        }

        const checkDuplicateQuery = 'SELECT ID FROM categoria WHERE nombre = ? AND ID <> ?';
        db.query(checkDuplicateQuery, [nombreCategoria, parseInt(id_categoria_gestion, 10)], (err, results) => {
            if (err) {
                return res.redirect('/stock?mensaje=' + encodeURIComponent('Error al validar la categoría.') + '&tipo=error');
            }

            if (results.length > 0) {
                return res.redirect('/stock?mensaje=' + encodeURIComponent('La categoría ya existe.') + '&tipo=error');
            }

            db.query('UPDATE categoria SET nombre = ? WHERE ID = ?', [nombreCategoria, parseInt(id_categoria_gestion, 10)], (err) => {
                if (err) {
                    return res.redirect('/stock?mensaje=' + encodeURIComponent('Error al actualizar la categoría.') + '&tipo=error');
                }
                res.redirect('/stock?mensaje=' + encodeURIComponent('Categoría actualizada correctamente.') + '&tipo=success');
            });
        });
        return;
    }

    if (accion === 'nuevo') {
        if (!nombre || !codigo_barras || !precio_venta || !stock || !id_tipo_producto) {
            return res.redirect('/stock?mensaje=' + encodeURIComponent('Complete todos los campos para cargar un producto nuevo.') + '&tipo=error');
        }

        // Verificar que el código de barras no esté duplicado
        const checkDuplicateQuery = `SELECT id_producto FROM producto WHERE codigo_barras = ?`;
        db.query(checkDuplicateQuery, [codigo_barras], (err, results) => {
            if (err) {
                return res.redirect('/stock?mensaje=' + encodeURIComponent('Error al validar el código de barras.') + '&tipo=error');
            }

            if (results.length > 0) {
                return res.redirect('/stock?mensaje=' + encodeURIComponent('El código de barras ya está registrado para otro producto.') + '&tipo=error');
            }

            const insertQuery = `INSERT INTO producto (nombre, codigo_barras, precio_costo, precio_venta, stock, id_tipo_producto, idCategoria)
                VALUES (?, ?, ?, ?, ?, ?, ?)`;
            db.query(insertQuery, [
                nombre,
                codigo_barras,
                parseFloat(precio_costo) || 0,
                parseFloat(precio_venta),
                parseInt(stock, 10),
                parseInt(id_tipo_producto, 10),
                id_categoria ? parseInt(id_categoria, 10) : null
            ], (err) => {
                if (err) {
                    return res.redirect('/stock?mensaje=' + encodeURIComponent('Error al cargar el producto.') + '&tipo=error');
                }
                res.redirect('/stock?mensaje=' + encodeURIComponent('Producto cargado correctamente.') + '&tipo=success');
            });
        });
        return;
    }

    if (accion === 'editar') {
        if (!id_producto || !nombre || !codigo_barras || !precio_venta || !stock || !id_tipo_producto) {
            return res.redirect('/stock?mensaje=' + encodeURIComponent('Complete todos los campos para editar el producto.') + '&tipo=error');
        }

        const checkDuplicateQuery = `SELECT id_producto FROM producto WHERE codigo_barras = ? AND id_producto <> ?`;
        db.query(checkDuplicateQuery, [codigo_barras, parseInt(id_producto, 10)], (err, results) => {
            if (err) {
                return res.redirect('/stock?mensaje=' + encodeURIComponent('Error al validar el código de barras.') + '&tipo=error');
            }

            if (results.length > 0) {
                return res.redirect('/stock?mensaje=' + encodeURIComponent('El código de barras ya está registrado para otro producto.') + '&tipo=error');
            }

            const updateQuery = `UPDATE producto SET nombre = ?, codigo_barras = ?, precio_costo = ?, precio_venta = ?, stock = ?, id_tipo_producto = ?, idCategoria = ? WHERE id_producto = ?`;
            db.query(updateQuery, [
                nombre,
                codigo_barras,
                parseFloat(precio_costo) || 0,
                parseFloat(precio_venta),
                parseInt(stock, 10),
                parseInt(id_tipo_producto, 10),
                id_categoria ? parseInt(id_categoria, 10) : null,
                parseInt(id_producto, 10)
            ], (err) => {
                if (err) {
                    return res.redirect('/stock?mensaje=' + encodeURIComponent('Error al actualizar el producto.') + '&tipo=error');
                }
                res.redirect('/stock?mensaje=' + encodeURIComponent('Producto actualizado correctamente.') + '&tipo=success');
            });
        });
        return;
    }

    if (!id_producto || !cantidad_a_agregar) {
        return res.redirect('/stock?mensaje=' + encodeURIComponent('Seleccione un producto y la cantidad a agregar.') + '&tipo=error');
    }

    const addQty = parseInt(cantidad_a_agregar, 10);
    if (isNaN(addQty) || addQty <= 0) {
        return res.redirect('/stock?mensaje=' + encodeURIComponent('Ingrese una cantidad válida para sumar al stock.') + '&tipo=error');
    }

    const updateQuery = `UPDATE producto SET stock = stock + ? WHERE id_producto = ?`;
    db.query(updateQuery, [addQty, parseInt(id_producto, 10)], (err) => {
        if (err) {
            return res.redirect('/stock?mensaje=' + encodeURIComponent('Error al actualizar el stock.') + '&tipo=error');
        }
        res.redirect('/stock?mensaje=' + encodeURIComponent('Stock actualizado correctamente.') + '&tipo=success');
    });
};
