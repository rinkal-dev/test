'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add invoice tracking fields to payments table
    await queryInterface.addColumn('payments', 'invoice_generated', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('payments', 'invoice_generated_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addColumn('payments', 'invoice_generation_attempts', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn('payments', 'invoice_generation_error', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
    });

    // Update existing successful payments that already have invoices
    await queryInterface.sequelize.query(`
      UPDATE payments p
      SET invoice_generated = true, invoice_generated_at = p.paid_at
      WHERE p.status = 'success'
      AND EXISTS (SELECT 1 FROM invoices i WHERE i.payment_id = p.id)
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('payments', 'invoice_generated');
    await queryInterface.removeColumn('payments', 'invoice_generated_at');
    await queryInterface.removeColumn('payments', 'invoice_generation_attempts');
    await queryInterface.removeColumn('payments', 'invoice_generation_error');
  },
};
