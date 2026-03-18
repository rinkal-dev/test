'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add currency_code column to wedding_groups
    await queryInterface.addColumn('wedding_groups', 'currency_code', {
      type: Sequelize.STRING(3),
      allowNull: false,
      defaultValue: 'USD',
      comment: 'ISO 4217 currency code for this wedding group',
    });

    // Add index for quick lookups
    await queryInterface.addIndex('wedding_groups', ['currency_code'], {
      name: 'idx_wedding_groups_currency_code',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('wedding_groups', 'idx_wedding_groups_currency_code');
    await queryInterface.removeColumn('wedding_groups', 'currency_code');
  },
};
