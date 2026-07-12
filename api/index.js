const axios = require('axios');
const cheerio = require('cheerio');

module.exports = async (req, res) => {
  // Mengizinkan aplikasi Android kamu (atau siapa saja) untuk mengakses API ini (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  try {
    const targetUrl = 'https://anichin.cafe/';
    
    // 1. Ambil HTML dari web target dengan User-Agent palsu agar tidak langsung diblokir
    const { data } = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 8000 // Batalkan jika web target tidak merespons dalam 8 detik
    });

    // 2. Load HTML ke Cheerio untuk diparsing
    const $ = cheerio.load(data);
    const updates = [];

    // 3. Selektor HTML (Ini disesuaikan dengan struktur tema WordPress/Anime yang dipakai Anichin)
    // Biasanya menggunakan class '.bs' atau '.listupd .utao'
    $('.listupd .utao, .localupdates .bs').each((index, element) => {
      const title = $(element).find('h2, h3').text().trim();
      const endpointUrl = $(element).find('a').attr('href');
      const thumbnail = $(element).find('img').attr('src') || $(element).find('img').attr('data-src');
      const episode = $(element).find('.epx').text().trim() || $(element).find('.eggo').text().trim();

      if (title && endpointUrl) {
        updates.push({
          title,
          episode: episode || 'Updated',
          thumbnail: thumbnail || '',
          url: endpointUrl
        });
      }
    });

    // 4. Kembalikan data dalam bentuk JSON sukses
    return res.status(200).json({
      status: true,
      message: "Success fetch data from Anichin",
      data: updates
    });

  } catch (error) {
    // Jika diblokir Cloudflare atau web down, kembalikan error JSON
    return res.status(500).json({
      status: false,
      message: "Gagal mengambil data. Kemungkinan web terproteksi Cloudflare atau sedang down.",
      error: error.message
    });
  }
};