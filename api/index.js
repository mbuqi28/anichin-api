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
    // Daftar domain untuk dicoba jika satu gagal
    const domains = [
        'https://anichin.cafe/',
        'https://anichin.best/',
        'https://anichin.live/'
    ];

    let lastError = null;

    for (const baseUrl of domains) {
        try {
            console.log(`Trying to scrape: ${baseUrl}`);
            const html = await fetchHTML(baseUrl);
            const $ = cheerio.load(html);
            const results = [];

            // Gunakan Set untuk memastikan URL benar-benar unik
            const seenUrls = new Set();

            $('.listupd .bs').each((i, el) => {
                const card = $(el);
                let title = card.find('.tt').contents().first().text().trim();
                let episode = card.find('.epxs').text().trim();
                let image = card.find('img').attr('src') || card.find('img').attr('data-src');
                let url = card.find('a').attr('href');

                // Jika title masih kosong, coba alternatif lain
                if (!title) title = card.find('.title').text().trim();

                // Normalisasi URL: hapus trailing slash dan pastikan lowercase untuk perbandingan
                if (url) {
                    url = url.replace(/\/$/, '').toLowerCase();
                }

                // Cek apakah URL sudah pernah diambil (mencegah dobel dari versi Mobile/Desktop web)
                if (title && url && !seenUrls.has(url)) {
                    seenUrls.add(url);

                    // Bersihkan episode dari kata-kata sampah
                    if (episode) {
                        episode = episode.replace(/Episode/g, 'Ep').replace(/Sub.*$/g, 'Sub').trim();
                    }

                    results.push({
                        title: title,
                        episode: episode,
                        image: image,
                        url: card.find('a').attr('href') // Simpan URL asli
                    });
                }
            });

            if (results.length > 0) {
                return res.json({ success: true, source: baseUrl, data: results });
            }
        } catch (error) {
            console.error(`Failed to scrape ${baseUrl}:`, error.message);
            lastError = error;
        }
    }

    // Jika semua domain gagal
    res.status(500).json({
        success: false,
        message: `All sources failed. Last error: ${lastError ? lastError.message : 'Unknown'}`,
        hint: 'Coba akses https://anichin.team di browser untuk melihat domain yang sedang aktif.'
    });
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

// Export untuk Vercel (tetap dipertahankan agar kompatibel)
module.exports = app;

// Jalankan server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
});
