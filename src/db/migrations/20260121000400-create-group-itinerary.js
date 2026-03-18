'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('group_itinerary', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: {
        type: Sequelize.CHAR(36),
        allowNull: false,
        unique: true,
      },
      wedding_group_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'wedding_groups',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      event_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      event_time: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Time in display format e.g. "5:00 PM"',
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      icon_type: {
        type: Sequelize.ENUM('drink', 'beach', 'wedding', 'food', 'relax', 'other'),
        allowNull: false,
        defaultValue: 'other',
      },
      sort_order: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // Add indexes
    await queryInterface.addIndex('group_itinerary', ['wedding_group_id']);
    await queryInterface.addIndex('group_itinerary', ['event_date']);
    await queryInterface.addIndex('group_itinerary', ['sort_order']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('group_itinerary');
  },
};
