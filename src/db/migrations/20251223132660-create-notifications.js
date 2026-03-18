'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('notifications', {
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
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'wedding_groups',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      guest_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'guests',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      booking_id: {
        type: Sequelize.BIGINT,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      },
      type: {
        type: Sequelize.ENUM(
          'invitation',
          'deposit_reminder',
          'final_reminder',
          'confirmation',
          'payment_received',
          'booking_cancelled',
          'refund_processed'
        ),
        allowNull: false,
      },
      channel: {
        type: Sequelize.ENUM('email', 'whatsapp'),
        allowNull: false,
      },
      subject: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
        comment: 'Email subject line',
      },
      content: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Message content/body',
      },
      recipient_email: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
        comment: 'Email address used (snapshot)',
      },
      recipient_phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null,
        comment: 'Phone number used (snapshot)',
      },
      external_id: {
        type: Sequelize.STRING,
        allowNull: true,
        defaultValue: null,
        comment: 'Provider message ID (SendGrid/Twilio)',
      },
      status: {
        type: Sequelize.ENUM('pending', 'sent', 'delivered', 'failed'),
        allowNull: false,
        defaultValue: 'pending',
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      retry_count: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 0,
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      opened_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Email open tracking',
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
    await queryInterface.addIndex('notifications', ['wedding_group_id']);
    await queryInterface.addIndex('notifications', ['guest_id']);
    await queryInterface.addIndex('notifications', ['booking_id']);
    await queryInterface.addIndex('notifications', ['type']);
    await queryInterface.addIndex('notifications', ['channel']);
    await queryInterface.addIndex('notifications', ['status']);
    await queryInterface.addIndex('notifications', ['external_id']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('notifications');
  },
};
