'use strict';

/**
 * Migration: Create guest_flights table
 *
 * Stores flight details for guests so admin can coordinate airport transfers.
 * Client requirement: "Implement full feature - admin can see all guest flights
 * & coordinate airport transfers as many times we are booking private transfers
 * or the hotel requires this data."
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('guest_flights', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      uuid: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        unique: true,
      },
      booking_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      guest_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'guests',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },

      // Arrival Flight Details
      arrival_airline: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      arrival_flight_number: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      arrival_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      arrival_time: {
        type: Sequelize.TIME,
        allowNull: true,
      },
      arrival_airport: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      arrival_terminal: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },

      // Departure Flight Details
      departure_airline: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      departure_flight_number: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      departure_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      departure_time: {
        type: Sequelize.TIME,
        allowNull: true,
      },
      departure_airport: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      departure_terminal: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },

      // Transfer Requirements
      needs_arrival_transfer: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      needs_departure_transfer: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      },
      passengers_count: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      transfer_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      // Admin Management Fields
      arrival_transfer_status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'not_needed', 'cancelled'),
        defaultValue: 'pending',
      },
      departure_transfer_status: {
        type: Sequelize.ENUM('pending', 'confirmed', 'not_needed', 'cancelled'),
        defaultValue: 'pending',
      },
      admin_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
      },

      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    // Indexes for common queries
    await queryInterface.addIndex('guest_flights', ['booking_id']);
    await queryInterface.addIndex('guest_flights', ['guest_id']);
    await queryInterface.addIndex('guest_flights', ['arrival_date']);
    await queryInterface.addIndex('guest_flights', ['departure_date']);
    await queryInterface.addIndex('guest_flights', ['arrival_transfer_status']);
    await queryInterface.addIndex('guest_flights', ['departure_transfer_status']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('guest_flights');
  },
};
