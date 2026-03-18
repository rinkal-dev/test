'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add cancellation_policy_id column
    await queryInterface.addColumn('refunds', 'cancellation_policy_id', {
      type: Sequelize.BIGINT.UNSIGNED,
      allowNull: true,
      defaultValue: null,
      references: {
        model: 'cancellation_policies',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    // Add policy_refund_percentage column
    await queryInterface.addColumn('refunds', 'policy_refund_percentage', {
      type: Sequelize.DECIMAL(5, 2),
      allowNull: true,
      defaultValue: null,
    });

    // Add original_payment_amount column
    await queryInterface.addColumn('refunds', 'original_payment_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    });

    // Add max_refundable_amount column
    await queryInterface.addColumn('refunds', 'max_refundable_amount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    });

    // Add index for cancellation_policy_id
    await queryInterface.addIndex('refunds', ['cancellation_policy_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('refunds', ['cancellation_policy_id']);
    await queryInterface.removeColumn('refunds', 'max_refundable_amount');
    await queryInterface.removeColumn('refunds', 'original_payment_amount');
    await queryInterface.removeColumn('refunds', 'policy_refund_percentage');
    await queryInterface.removeColumn('refunds', 'cancellation_policy_id');
  },
};
