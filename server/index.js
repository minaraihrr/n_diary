import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './db.js';

const PORT = 8080;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// publicフォルダ静的配信
app.use(express.static(path.join(__dirname, '../public')));

// 最古年データ取得
app.get('/api/diaries/years/min', async (req, res) => {
    // データ取得
    try {
        const result = await pool.query(`
          SELECT MIN(EXTRACT(YEAR FROM entry_date)) AS min_year
          FROM diaries
        `);
        res.json({ 
          min_year: result.rows[0].min_year 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

app.get('/api/diaries', async (req, res) => {
    const { date, year } = req.query;

    // データ取得
    try {
        const result = await pool.query(`
            WITH target_dates AS (
                SELECT ($1::date - make_interval(years => g.i))::date AS entry_date
                FROM generate_series(0, $2 - 1) AS g(i) 
            )
            SELECT
                t.entry_date,
                d.id,
                d.content
            FROM target_dates t
            LEFT JOIN diaries d
                ON t.entry_date = d.entry_date
            ORDER BY t.entry_date DESC
            `, [date, year]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

app.use(express.json());
app.post('/api/diaries', async (req, res) => {
  const { date, content } = req.body;

  // バリデーション
  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: 'entry_date is required (YYYY-MM-DD)' });
  }

  try {
      const result = await pool.query(
        `INSERT INTO diaries (entry_date, content)
        VALUES ($1::date, $2)
        ON CONFLICT (entry_date) DO UPDATE
            SET content = EXCLUDED.content,
                updated_at = now()
        RETURNING id, entry_date, content, created_at, updated_at
        `,[date, content]
    );

    res.json({ diary: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});