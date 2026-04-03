const db = require('../src/config/db');
const { productosDemo } = require('../src/data/mockData');

exports.getKiosco = (req, res) => {
    const usuario = req.session.usuarioNombre || 'Usuario';
    
    // Modo de desarrollo: usar datos mock
    if (process.env.USE_MOCK_DATA === 'true') {
        return res.render('kiosco', { 
            title: 'Ventas Kiosco', 
            error: null, 
            usuario, 
            products: productosDemo 
        });
    }

    // Modo producción: consultar BD
    const query = 'SELECT nombre, precio_venta FROM producto';

    db.query(query, (err, results) => {
        if (err) {
            // Si hay error, mandamos la lista vacía para que no explote el EJS
            return res.render('kiosco', { 
                title: 'Ventas Kiosco', 
                error: 'Error al cargar productos', 
                usuario, 
                products: [] 
            });
        }

        // Pasamos "results" como "products"
        res.render('kiosco', { 
            title: 'Ventas Kiosco', 
            error: null, 
            usuario, 
            products: results 
        });
    });
};

// Si vas a buscar por nombre mediante AJAX (opcional, si no usás el datalist)
exports.buscarProductoPorNombre = (req, res) => {
    const { nombre } = req.params;
    
    // Modo de desarrollo: usar datos mock
    if (process.env.USE_MOCK_DATA === 'true') {
        const resultado = productosDemo.filter(p => 
            p.nombre.toLowerCase().includes(nombre.toLowerCase())
        );
        
        if (resultado.length > 0) {
            return res.json(resultado);
        } else {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
    }

    // Modo producción: consultar BD
    const query = 'SELECT * FROM producto WHERE nombre LIKE ?';

    db.query(query, [`%${nombre}%`], (err, results) => {
        if (err) return res.status(500).json({ error: 'Error de DB' });
        if (results.length > 0) {
            res.json(results);
        } else {
            res.status(404).json({ error: 'Producto no encontrado' });
        }
    });
};