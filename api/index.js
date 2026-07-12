const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        message: 'Anichin Scraper API is running on Vercel',
        endpoints: {
            latest: '/api/latest',
            search: '/api/search?q=btth'
        }
    });
});

// Contoh Endpoint untuk Latest Donghua (Anichin)
app.get('/api/latest', async (req, res) => {
    try {
        const url = 'https://anichin.vip/'; // Ganti dengan URL Anichin yang aktif
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const results = [];

        $('.listupd .bs').each((i, el) => {
            results.push({
                title: $(el).find('.tt').text().trim(),
                episode: $(el).find('.epxs').text().trim(),
                image: $(el).find('img').attr('src'),
                link: $(el).find('a').attr('href')
            });
        });

        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Export untuk Vercel
module.exports = app;

// Jalankan server jika di lokal (bukan Vercel)
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server lokal berjalan di http://localhost:${PORT}`);
    });
}
