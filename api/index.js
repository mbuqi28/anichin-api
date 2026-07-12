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
        message: 'Anichin Scraper API is running on Railway',
        endpoints: {
            latest: '/api/latest',
            search: '/api/search?q=btth',
            details: '/api/details?url=URL_DONGHUA'
        }
    });
});

// Endpoint untuk Latest Donghua (Anichin)
app.get('/api/latest', async (req, res) => {
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

            // Gunakan Set untuk pelacakan yang sangat ketat
            const seen = new Set();

            // Kita cari container listupd yang spesifik berisi item terbaru
            $('.listupd .bs').each((i, el) => {
                const card = $(el);

                // Ambil judul murni tanpa teks anak (anak biasanya berisi episode/label)
                let title = card.find('.tt').contents().first().text().trim();
                if (!title) title = card.find('.title').text().trim();

                let episode = card.find('.epxs').text().trim();
                let image = card.find('img').attr('src') || card.find('img').attr('data-src') || card.find('img').attr('data-lazy-src');
                let url = card.find('a').attr('href');

                if (!title || !url) return;

                // NORMALISASI UNTUK CEK DUPLIKAT
                // Kita bersihkan judul agar "Judul Ep 1" dan "Judul" dianggap sama untuk pengecekan
                const cleanTitle = title.toLowerCase().split(' episode')[0].split(' ep ')[0].trim();

                // Normalisasi URL: ambil slug saja (misal: /anime/judul/)
                let urlSlug = url.replace(baseUrl, '').replace(/\/$/, '').toLowerCase();

                if (!seen.has(urlSlug) && !seen.has(cleanTitle)) {
                    seen.add(urlSlug);
                    seen.add(cleanTitle);

                    if (episode) {
                        episode = episode.replace(/Episode/g, 'Ep').replace(/Sub.*$/g, 'Sub').trim();
                    }

                    results.push({
                        title: title,
                        episode: episode,
                        image: image,
                        url: url
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

    res.status(500).json({
        success: false,
        message: `All sources failed. Last error: ${lastError ? lastError.message : 'Unknown'}`
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
        const seen = new Set();

        $('.listupd .bs').each((i, el) => {
            const title = $(el).find('.tt').text().trim();
            const url = $(el).find('a').attr('href');

            if (title && url && !seen.has(url)) {
                seen.add(url);
                results.push({
                    title: title,
                    type: $(el).find('.typez').text().trim(),
                    status: $(el).find('.status').text().trim(),
                    image: $(el).find('img').attr('src'),
                    url: url
                });
            }
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

module.exports = app;

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server berjalan di port ${PORT}`);
});
