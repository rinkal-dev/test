'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('group_addons', {
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
      addon_type: {
        type: Sequelize.ENUM(
          'extra_adult',
          'extra_child',
          'extra_bed',
          'breakfast',
          'airport_transfer',
          'late_checkout',
          'early_checkin',
          'other'
        ),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
        comment: 'Custom display name for the addon',
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
      },
      is_per_night: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'true = per night, false = flat fee',
      },
      max_quantity: {
        type: Sequelize.SMALLINT,
        allowNull: true,
        defaultValue: null,
        comment: 'Maximum allowed per booking',
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
    await queryInterface.addIndex('group_addons', ['wedding_group_id']);
    await queryInterface.addIndex('group_addons', ['addon_type']);
    await queryInterface.addIndex('group_addons', ['is_active']);

    // Note: Removed unique constraint on (wedding_group_id, addon_type)
    // to allow multiple addons of the same type per wedding group
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('group_addons');
  },
};
