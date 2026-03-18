'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();

    const currencies = [
      {
        uuid: uuidv4(),
        code: 'USD',
        name: 'US Dollar',
        symbol: '$',
        exchange_rate: 1.000000,
        decimal_places: 2,
        is_default: true,
        is_active: true,
        stripe_supported: true,
        exchange_rate_updated_at: now,
        created_at: now,
        updated_at: null,
      },
      {
        uuid: uuidv4(),
        code: 'EUR',
        name: 'Euro',
        symbol: '€',
        exchange_rate: 0.920000,
        decimal_places: 2,
        is_default: false,
        is_active: true,
        stripe_supported: true,
        exchange_rate_updated_at: now,
        created_at: now,
        updated_at: null,
      },
      {
        uuid: uuidv4(),
        code: 'GBP',
        name: 'British Pound',
        symbol: '£',
        exchange_rate: 0.790000,
        decimal_places: 2,
        is_default: false,
        is_active: true,
        stripe_supported: true,
        exchange_rate_updated_at: now,
        created_at: now,
        updated_at: null,
      },
      {
        uuid: uuidv4(),
        code: 'INR',
        name: 'Indian Rupee',
        symbol: '₹',
        exchange_rate: 83.000000,
        decimal_places: 2,
        is_default: false,
        is_active: true,
        stripe_supported: true,
        exchange_rate_updated_at: now,
        created_at: now,
        updated_at: null,
      },
      {
        uuid: uuidv4(),
        code: 'AUD',
        name: 'Australian Dollar',
        symbol: 'A$',
        exchange_rate: 1.530000,
        decimal_places: 2,
        is_default: false,
        is_active: true,
        stripe_supported: true,
        exchange_rate_updated_at: now,
        created_at: now,
        updated_at: null,
      },
      {
        uuid: uuidv4(),
        code: 'CAD',
        name: 'Canadian Dollar',
        symbol: 'C$',
        exchange_rate: 1.360000,
        decimal_places: 2,
        is_default: false,
        is_active: true,
        stripe_supported: true,
        exchange_rate_updated_at: now,
        created_at: now,
        updated_at: null,
      },
      {
        uuid: uuidv4(),
        code: 'JPY',
        name: 'Japanese Yen',
        symbol: '¥',
        exchange_rate: 148.000000,
        decimal_places: 0,
        is_default: false,
        is_active: true,
        stripe_supported: true,
        exchange_rate_updated_at: now,
        created_at: now,
        updated_at: null,
      },
      {
        uuid: uuidv4(),
        code: 'MXN',
        name: 'Mexican Peso',
        symbol: 'MX$',
        exchange_rate: 17.200000,
        decimal_places: 2,
        is_default: false,
        is_active: true,
        stripe_supported: true,
        exchange_rate_updated_at: now,
        created_at: now,
        updated_at: null,
      },
    ];

    // Check if currencies already exist
    const existingCurrencies = await queryInterface.sequelize.query(
      `SELECT code FROM currencies WHERE code IN ('USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'MXN')`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const existingCodes = existingCurrencies.map(c => c.code);
    const currenciesToInsert = currencies.filter(c => !existingCodes.includes(c.code));

    if (currenciesToInsert.length > 0) {
      await queryInterface.bulkInsert('currencies', currenciesToInsert);
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('currencies', {
      code: { [Sequelize.Op.in]: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'MXN'] }
    });
  }
};
