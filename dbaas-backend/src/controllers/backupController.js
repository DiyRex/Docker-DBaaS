const { exec } = require('child_process');
const Docker = require('dockerode');
const docker = new Docker();
const path = require('path');
const fs = require('fs');

// Create a backup
exports.createBackup = async (req, res) => {
    const { userId, dbName, userPassword } = req.body;
    const mysqlContainerName = `mysql_${userId}`;
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
  
    const backupFileName = `backup_${userId}_${Date.now()}.sql`;
    const backupFilePath = path.join(backupDir, backupFileName);
  
    try {
      // Run mysqldump command inside the container
      const command = `docker exec ${mysqlContainerName} mysqldump -u root -p${userPassword} ${dbName} > ${backupFilePath}`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Backup failed: ${error.message}`);
          return res.status(500).json({ error: 'Backup failed' });
        }
        res.status(201).json({ message: 'Backup created successfully', backupFile: backupFileName });
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  };
  
  // List backups for a user
  exports.listBackups = async (req, res) => {
    const { userId } = req.params;
  
    try {
      // Read backup files from the backup directory
      const files = fs.readdirSync(backupDir).filter(file => file.includes(`backup_${userId}`));
      
      res.status(200).json({ backups: files });
    } catch (error) {
      console.error('Error listing backups:', error);
      res.status(500).json({ error: 'Failed to list backups' });
    }
  };
  
  // Restore a backup
  exports.restoreBackup = async (req, res) => {
    const { userId, backupFile, userPassword } = req.body;
    const mysqlContainerName = `mysql_${userId}`;
    const backupFilePath = path.join(backupDir, backupFile);
  
    if (!fs.existsSync(backupFilePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
  
    try {
      // Run mysql command inside the container to restore the database
      const command = `docker exec -i ${mysqlContainerName} mysql -u root -p${userPassword} < ${backupFilePath}`;
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Restore failed: ${error.message}`);
          return res.status(500).json({ error: 'Restore failed' });
        }
        res.status(200).json({ message: 'Backup restored successfully' });
      });
    } catch (error) {
      console.error('Error restoring backup:', error);
      res.status(500).json({ error: 'Failed to restore backup' });
    }
  };
  
  // Delete a backup
  exports.deleteBackup = async (req, res) => {
    const { userId, backupFile } = req.body;
    const backupFilePath = path.join(backupDir, backupFile);
  
    if (!fs.existsSync(backupFilePath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
  
    try {
      fs.unlinkSync(backupFilePath); // Delete the file
      res.status(200).json({ message: 'Backup deleted successfully' });
    } catch (error) {
      console.error('Error deleting backup:', error);
      res.status(500).json({ error: 'Failed to delete backup' });
    }
  };
  