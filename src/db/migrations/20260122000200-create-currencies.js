'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('currencies', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        unique: true,
      },
      code: {
        type: Sequelize.STRING(3),
        allowNull: false,
        unique: true,
        comment: 'ISO 4217 currency code (USD, EUR, GBP, etc.)',
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Full currency name (US Dollar, Euro, etc.)',
      },
      symbol: {
        type: Sequelize.STRING(10),
        allowNull: false,
        comment: 'Currency symbol ($, €, £, etc.)',
      },
      exchange_rate: {
        type: Sequelize.DECIMAL(12, 6),
        allowNull: false,
        defaultValue: 1.000000,
        comment: 'Exchange rate relative to base currency',
      },
      decimal_places: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 2,
        comment: 'Number of decimal places (usually 2, some currencies use 0 or 3)',
      },
      is_default: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Only one currency can be default',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether available for selection in bookings',
      },
      stripe_supported: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether Stripe supports this currency',
      },
      exchange_rate_updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'When exchange rate was last updated',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
    });

    // Add index for quick lookups
    await queryInterface.addIndex('currencies', ['code']);
    await queryInterface.addIndex('currencies', ['is_active']);
    await queryInterface.addIndex('currencies', ['is_default']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('currencies');
  },
};
