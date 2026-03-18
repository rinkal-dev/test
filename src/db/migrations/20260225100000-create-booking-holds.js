'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('booking_holds', {
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
      room_block_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'group_room_blocks',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Number of rooms being held',
      },
      guest_session_id: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Browser session ID or guest identifier',
      },
      checkout_token: {
        type: Sequelize.STRING(255),
        allowNull: true,
        unique: true,
        comment: 'Payment session token for this hold',
      },
      status: {
        type: Sequelize.ENUM('active', 'payment_pending', 'converted', 'released', 'expired'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Hold lifecycle status',
      },
      check_in_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      check_out_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
      },
      held_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'When this hold expires (default: 30 minutes from held_at)',
      },
      release_reason: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Reason for release if released/expired',
      },
      released_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      converted_to_booking_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Booking ID if converted to actual booking',
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

    // Add indexes for performance
    await queryInterface.addIndex('booking_holds', ['wedding_group_id', 'room_block_id', 'check_in_date', 'check_out_date'], {
      name: 'idx_booking_holds_availability',
    });
    await queryInterface.addIndex('booking_holds', ['guest_session_id'], {
      name: 'idx_booking_holds_session',
    });
    await queryInterface.addIndex('booking_holds', ['checkout_token'], {
      name: 'idx_booking_holds_checkout_token',
    });
    await queryInterface.addIndex('booking_holds', ['expires_at'], {
      name: 'idx_booking_holds_expires',
    });
    await queryInterface.addIndex('booking_holds', ['status'], {
      name: 'idx_booking_holds_status',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('booking_holds');
  },
};
