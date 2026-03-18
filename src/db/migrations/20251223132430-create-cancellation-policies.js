'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('cancellation_policies', {
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
      wedding_group_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'wedding_groups',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      days_before_event: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Threshold in days before event',
      },
      refund_percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Refund percentage (0-100)',
      },
      description: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
        comment: 'Human-readable description e.g., Full refund period',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
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
    await queryInterface.addIndex('cancellation_policies', ['wedding_group_id']);
    await queryInterface.addIndex('cancellation_policies', ['days_before_event']);
    await queryInterface.addIndex('cancellation_policies', ['is_active']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('cancellation_policies');
  },
};
