const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

// Suffix overrides for Taiwan stocks
const SUFFIX_OVERRIDES = {
    '00937B': '.TWO',
    '00675L': '.TW',
    '00929': '.TW',
};

// Default price database for fallback
const PRICE_DATABASE = {

};

/**
 * GET /api/stocks/price/:ticker
 * Fetch stock price from Yahoo Finance
 */
router.get('/price/:ticker', async (req, res) => {
    try {
        const cleanTicker = req.params.ticker.trim().toUpperCase();

        // Determine suffix
        let suffix = '.TW';
        if (SUFFIX_OVERRIDES[cleanTicker]) {
            suffix = SUFFIX_OVERRIDES[cleanTicker];
        } else if (/^[A-Z]+$/.test(cleanTicker)) {
            suffix = ''; // US stocks
        }
        const yahooSymbol = cleanTicker + suffix;

        // Fetch from Yahoo Finance
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
        });

        if (!response.ok) {
            throw new Error(`Yahoo Finance API error: ${response.status}`);
        }

        const data = await response.json();

        const result = data?.chart?.result?.[0];
        const price = result?.meta?.regularMarketPrice;

        if (price && price > 0) {
            return res.json({
                ticker: yahooSymbol,
                price: parseFloat(price.toFixed(2)),
                isEstimate: false,
                source: 'yahoo_finance',
                timestamp: new Date().toISOString(),
            });
        }

        // Fallback to database
        const fallbackPrice = PRICE_DATABASE[yahooSymbol];
        if (fallbackPrice) {
            return res.json({
                ticker: yahooSymbol,
                price: parseFloat(fallbackPrice.toFixed(2)),
                isEstimate: true,
                source: 'fallback_database',
                timestamp: new Date().toISOString(),
            });
        }

        // Not found
        return res.status(404).json({
            error: 'Stock price not found',
            ticker: yahooSymbol,
        });

    } catch (error) {
        console.error('Error fetching stock price:', error);
        res.status(500).json({
            error: 'Failed to fetch stock price',
            message: error.message,
        });
    }
});

module.exports = router;
