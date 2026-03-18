'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('group_room_blocks', {
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
      room_type_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'room_types',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      rooms_allocated: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Number of rooms blocked for this group',
      },
      rooms_booked: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Counter of rooms already booked',
      },
      price_per_night: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Negotiated price for this group',
      },
      min_nights: {
        type: Sequelize.SMALLINT,
        allowNull: true,
        defaultValue: null,
        comment: 'Minimum stay requirement',
      },
      max_nights: {
        type: Sequelize.SMALLINT,
        allowNull: true,
        defaultValue: null,
        comment: 'Maximum stay allowed',
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
    await queryInterface.addIndex('group_room_blocks', ['wedding_group_id']);
    await queryInterface.addIndex('group_room_blocks', ['room_type_id']);
    await queryInterface.addIndex('group_room_blocks', ['is_active']);

    // Unique constraint: one room type per wedding group
    await queryInterface.addIndex('group_room_blocks', ['wedding_group_id', 'room_type_id'], {
      unique: true,
      name: 'unique_group_room_type',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('group_room_blocks');
  },
};
