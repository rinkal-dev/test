'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('room_types', {
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
      hotel_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'hotels',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      slug: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      bed_type: {
        type: Sequelize.ENUM('king', 'queen', 'twin', 'double', 'single', 'other'),
        allowNull: true,
        defaultValue: null,
      },
      room_size: {
        type: Sequelize.STRING(50),
        allowNull: true,
        defaultValue: null,
        comment: 'Room size e.g., 45 sqm',
      },
      max_adults: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 2,
      },
      max_children: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 1,
      },
      max_occupancy: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 3,
        comment: 'Total max people (adults + children)',
      },
      base_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
        comment: 'Standard rack rate for reference',
      },
      amenities: {
        type: Sequelize.JSON,
        allowNull: true,
        defaultValue: null,
        comment: 'Room amenities list',
      },
      image_url: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
      },
      sort_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order',
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
    await queryInterface.addIndex('room_types', ['hotel_id']);
    await queryInterface.addIndex('room_types', ['is_active']);
    await queryInterface.addIndex('room_types', ['hotel_id', 'slug'], { unique: true });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('room_types');
  },
};
