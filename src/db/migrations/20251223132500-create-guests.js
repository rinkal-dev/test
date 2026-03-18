'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('guests', {
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
      access_token: {
        type: Sequelize.STRING(64),
        unique: true,
        allowNull: false,
        comment: 'Unique token for personalized booking link',
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
        defaultValue: null,
      },
      relationship: {
        type: Sequelize.ENUM('family', 'friend', 'colleague', 'other'),
        allowNull: true,
        defaultValue: null,
      },
      side: {
        type: Sequelize.ENUM('bride', 'groom', 'mutual'),
        allowNull: true,
        defaultValue: null,
      },
      plus_ones_allowed: {
        type: Sequelize.SMALLINT,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of additional guests allowed',
      },
      invitation_channel: {
        type: Sequelize.ENUM('email', 'whatsapp', 'both'),
        allowNull: false,
        defaultValue: 'email',
      },
      invitation_sent: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      invitation_sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      invitation_opened_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      last_reminder_sent_at: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
      },
      import_source: {
        type: Sequelize.ENUM('api', 'excel', 'manual'),
        allowNull: false,
        defaultValue: 'manual',
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Admin notes about guest',
      },
      status: {
        type: Sequelize.ENUM('pending', 'invited', 'booked', 'declined'),
        allowNull: false,
        defaultValue: 'pending',
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
    await queryInterface.addIndex('guests', ['wedding_group_id']);
    await queryInterface.addIndex('guests', ['access_token']);
    await queryInterface.addIndex('guests', ['email']);
    await queryInterface.addIndex('guests', ['status']);
    await queryInterface.addIndex('guests', ['invitation_sent']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('guests');
  },
};
