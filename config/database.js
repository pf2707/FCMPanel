const { Sequelize } = require('sequelize');
const path = require('path');

const dbPath = path.resolve(__dirname, '../data/database.sqlite');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

const initializeDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log('SQLite database connection established successfully');
    await sequelize.sync();
    console.log('All models were synchronized successfully');
    return sequelize;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    throw error;
  }
};

module.exports = { sequelize, initializeDatabase }; 