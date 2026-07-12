const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

// Helper function for axios
const fetchHTML = async (url) => {
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': 'https://www.google.com/'
        },
        timeout: 10000 // 10 seconds timeout
    });
    return data;
};

app.get('/', (req, res) => {
    res.json({
        message: 'Anichin Scraper API is running on Vercel',
        endpoints: {
            latest: '/api/latest',
            search: '/api/search?q=btth',
            details: '/api/details?url=URL_DONGHUA'
        }
    });
});

// Endpoint untuk Latest Donghua (Anichin)
app.get('/api/latest', async (req, res) => {
    try {
        // Coba anichin.best terlebih dahulu karena anichin.cafe mungkin dialihkan atau diblokir
        const baseUrl = 'https://anichin.best/';
        const html = await fetchHTML(baseUrl);
        const $ = cheerio.load(html);
        const results = [];

        // Selector .listupd .bs atau .listupd .utao sering digunakan
        $('.listupd .bs, .listupd .utao').each((i, el) => {
            const title = $(el).find('.tt, .title, .entry-title').text().trim();
            const episode = $(el).find('.epxs, .ep').text().trim();
            const image = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');
            const url = $(el).find('a').attr('href');

            if (title && url) {
                results.push({ title, episode, image, url });
            }
        });

        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Scrape Error:', error.message);
        res.status(500).json({
            success: false,
            message: `Scrape Failed: ${error.message}`,
            hint: 'Website target mungkin sedang memblokir request atau domain telah berganti.'
        });
    }
});

// Endpoint untuk Search Donghua
app.get('/api/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) return res.status(400).json({ success: false, message: 'Query parameter q is required' });

        const url = `https://anichin.cafe/?s=${encodeURIComponent(query)}`;
        const html = await fetchHTML(url);
        const $ = cheerio.load(html);
        const results = [];

        $('.listupd .bs').each((i, el) => {
            results.push({
                title: $(el).find('.tt').text().trim(),
                type: $(el).find('.typez').text().trim(),
                status: $(el).find('.status').text().trim(),
                image: $(el).find('img').attr('src'),
                url: $(el).find('a').attr('href')
            });
        });

        res.json({ success: true, data: results });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Endpoint untuk Detail Donghua
app.get('/api/details', async (req, res) => {
    try {
        const targetUrl = req.query.url;
        if (!targetUrl) return res.status(400).json({ success: false, message: 'URL parameter is required' });

        const html = await fetchHTML(targetUrl);
        const $ = cheerio.load(html);

        const details = {
            title: $('.entry-title').text().trim(),
            image: $('.thumb img').attr('src'),
            synopsis: $('.entry-content').text().trim(),
            genres: [],
            episodes: []
        };

        $('.genxed a').each((i, el) => {
            details.genres.push($(el).text().trim());
        });

        $('.eplister ul li').each((i, el) => {
            details.episodes.push({
                episode: $(el).find('.epl-num').text().trim(),
                title: $(el).find('.epl-title').text().trim(),
                date: $(el).find('.epl-date').text().trim(),
                url: $(el).find('a').attr('href')
            });
        });

        res.json({ success: true, data: details });
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
