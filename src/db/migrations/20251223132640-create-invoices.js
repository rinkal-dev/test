'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('invoices', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT,
      },
      uuid: {
        type: Sequelize.CHAR(36),
        unique: true,
        allowNull: false,
      },
      booking_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      payment_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'payments',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      invoice_number: {
        type: Sequelize.STRING(50),
        unique: true,
        allowNull: false,
      },
      invoice_type: {
        type: Sequelize.ENUM('deposit', 'final'),
        allowNull: false,
      },
      subtotal: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Amount before tax',
      },
      tax_amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Total invoice amount',
      },
      currency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'USD',
      },
      status: {
        type: Sequelize.ENUM('draft', 'issued', 'paid', 'cancelled'),
        allowNull: false,
        defaultValue: 'draft',
      },
      due_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        defaultValue: null,
      },
      issued_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      pdf_url: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
        comment: 'Generated PDF link',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Invoice terms/notes',
      },
      created_at: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: true,
        defaultValue: null,
        type: Sequelize.DATE,
      },
    });

    // Add indexes
    await queryInterface.addIndex('invoices', ['booking_id']);
    await queryInterface.addIndex('invoices', ['payment_id']);
    await queryInterface.addIndex('invoices', ['invoice_number']);
    await queryInterface.addIndex('invoices', ['invoice_type']);
    await queryInterface.addIndex('invoices', ['status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('invoices');
  },
};
