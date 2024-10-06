// src/routes/containers.js
const express = require("express");
const router = express.Router();
const {
  createContainer,
  stopContainer,
  deleteContainer,
  listContainers,
} = require("../controllers/containersController");

const {
  createBackup,
  listBackups,
  restoreBackup,
  deleteBackup,
} = require("../controllers/backupController");

// const cron = require('node-cron');
// const { createBackup } = require('./controllers/containersController');

// // Schedule daily backups at midnight
// cron.schedule('0 0 * * *', () => {
//   // Define the parameters for backup
//   const backupParams = {
//     userId: 'test_user1',
//     dbName: 'testdb',
//     userPassword: 'password123'
//   };

//   // Trigger backup
//   createBackup({ body: backupParams }, { status: () => ({ json: () => {} }) });
// });

// Route to create a new container
router.post("/create", createContainer);

// Route to stop a container
router.post("/stop", stopContainer);

// Route to delete a container
router.post("/delete", deleteContainer);

// Route to list all containers
router.get("/", listContainers);

// Backup Data
router.post("/backup/create", createBackup);
router.get("/backup/list/:userId", listBackups);
router.post("/backup/restore", restoreBackup);
router.post("/backup/delete", deleteBackup);

module.exports = router;
