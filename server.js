const express = require('express');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Konfigurasi Database PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || '108.62.161.189',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'bimoganteng',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'complaint_db',
});

// Middleware & View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// -------------------------------------------------------------
// SISI MEMBER: FORM INPUT KELUHAN (4 FIELD)
// -------------------------------------------------------------
app.get('/', async (req, res) => {
  try {
    const categoriesResult = await pool.query(
      'SELECT id, nama_kategori FROM complaint_categories ORDER BY nama_kategori ASC'
    );
    const today = new Date().toISOString().split('T')[0];
    res.render('index', { 
      categories: categoriesResult.rows, 
      today, 
      success: req.query.success === '1' 
    });
  } catch (err) {
    console.error('[Database Error]:', err.message);
    res.status(500).send('Gagal terhubung ke database. Pastikan konfigurasi di .env sudah sesuai.');
  }
});

// SISI MEMBER: PROSES SUBMIT
app.post('/submit', async (req, res) => {
  const { kode_member, tanggal, category_id, keluhan } = req.body;

  if (!kode_member || !tanggal || !category_id || !keluhan) {
    return res.status(400).send('Semua data wajib diisi.');
  }

  try {
    const insertQuery = `
      INSERT INTO complaints (kode_member, branch_id, category_id, tanggal, keluhan)
      VALUES (
        $1,
        (SELECT branch_id FROM members WHERE kode_member = $1 LIMIT 1),
        $2,
        $3,
        $4
      )
    `;
    await pool.query(insertQuery, [
      kode_member.trim(),
      parseInt(category_id),
      tanggal,
      keluhan.trim(),
    ]);

    res.redirect('/?success=1');
  } catch (err) {
    console.error('[Submit Error]:', err.message);
    res.status(500).send('Gagal menyimpan keluhan ke database.');
  }
});

// -------------------------------------------------------------
// SISI MANAGER: MONITORING DASHBOARD (READ ONLY)
// -------------------------------------------------------------
app.get('/manager', async (req, res) => {
  try {
    const { branch_id, category_id, start_date, end_date, search } = req.query;

    const branchesResult = await pool.query('SELECT id, nama_cabang FROM branches ORDER BY nama_cabang ASC');
    const categoriesResult = await pool.query('SELECT id, nama_kategori FROM complaint_categories ORDER BY nama_kategori ASC');

    let conditions = [];
    let values = [];
    let idx = 1;

    if (branch_id) {
      conditions.push(`c.branch_id = $${idx++}`);
      values.push(parseInt(branch_id));
    }
    if (category_id) {
      conditions.push(`c.category_id = $${idx++}`);
      values.push(parseInt(category_id));
    }
    if (start_date) {
      conditions.push(`c.tanggal >= $${idx++}`);
      values.push(start_date);
    }
    if (end_date) {
      conditions.push(`c.tanggal <= $${idx++}`);
      values.push(end_date);
    }
    if (search) {
      conditions.push(`(c.keluhan ILIKE $${idx} OR c.kode_member ILIKE $${idx})`);
      values.push(`%${search.trim()}%`);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const listQuery = `
      SELECT 
        c.id,
        TO_CHAR(c.tanggal, 'DD Mon YYYY') AS tanggal_formatted,
        c.tanggal,
        c.kode_member,
        COALESCE(m.nama_member, '-') AS nama_member,
        COALESCE(b.nama_cabang, 'Cabang Tidak Terdata') AS nama_cabang,
        cat.nama_kategori,
        c.keluhan,
        c.created_at
      FROM complaints c
      LEFT JOIN members m ON c.kode_member = m.kode_member
      LEFT JOIN branches b ON c.branch_id = b.id
      JOIN complaint_categories cat ON c.category_id = cat.id
      ${whereClause}
      ORDER BY c.tanggal DESC, c.created_at DESC
    `;
    const complaintsResult = await pool.query(listQuery, values);

    const summaryResult = await pool.query(`
      SELECT 
        COUNT(id) AS total_all,
        COUNT(CASE WHEN tanggal = CURRENT_DATE THEN 1 END) AS total_today
      FROM complaints
    `);

    res.render('manager', {
      complaints: complaintsResult.rows,
      branches: branchesResult.rows,
      categories: categoriesResult.rows,
      summary: summaryResult.rows[0],
      filters: { branch_id, category_id, start_date, end_date, search }
    });
  } catch (err) {
    console.error('[Dashboard Error]:', err.message);
    res.status(500).send('Gagal memuat dashboard monitoring manager.');
  }
});

app.listen(port, () => {
  console.log(`[Complaint App] Berjalan aktif di http://localhost:${port}`);
});
