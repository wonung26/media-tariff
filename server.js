const express = require('express');
const app = express();
const port = 3001;

// const BASE_URL = 

app.use(express.json()); // Middleware to parse JSON request bodies

app.get('/api/brands', async (req, res) => {
  try {
    const response = await fetch('https://tarife-api2.mediamarkt.de/listing');
    const data = await response.json();
    const brands = [...new Set(data.payload?.map(device => device.offers?.[0].manufacturer).filter(Boolean))];
    res.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'Failed to fetch brands' });
  }
});

app.get('/api/offers', async (req, res) => {
  const { brand } = req.query;
  if (!brand) {
    return res.status(400).json({ error: 'Brand parameter is required' });
  }

  try {
    const response = await fetch('https://tarife-api2.mediamarkt.de/listing');
    const data = await response.json();
    const filteredDevices = data.payload?.filter(
      (device) => device.offers?.[0].manufacturer?.toLowerCase() === brand.toLowerCase()
    );

    const offers = [];
    for (const device of filteredDevices) {
      if (device.offers && device.offers.length > 0) {
        const tariffsResponse = await fetch(
          `https://tarife-api2.mediamarkt.de/v1/offergroup/${device.offers[0].offerGroup}/tariff`
        );
        const tariffsData = await tariffsResponse.json();
        const tariffs = tariffsData.payload;

        if (tariffs && tariffs.length > 0) {
          const lowestPriceOffer = tariffs
            .map(tariff => ({
              ...tariff,
              totalPrice: Number(
                (tariff.oneTimePriceFrom || 0) +
                  (tariff.monthlyPrice || 0) * (tariff.contractTerm || 0) +
                  (tariff.connectionFee || 0)
              ).toFixed(2),
            }))
            .sort((a, b) => a.totalPrice - b.totalPrice)[0];

          if (lowestPriceOffer) {
            offers.push({
              deviceName: device.offers[0].name,
              lowestPricePackage: lowestPriceOffer.internalName,
              totalPrice: lowestPriceOffer.totalPrice,
            });
          }
        }
      }
    }
    res.json(offers);
  } catch (error) {
    console.error('Error fetching offers:', error);
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

app.listen(port, () => {
  console.log(`Backend listening on port ${port}`);
});