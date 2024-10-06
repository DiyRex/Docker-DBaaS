const { exec } = require('child_process');
const Docker = require('dockerode');
const docker = new Docker();
const path = require('path');
const fs = require('fs');
const {updateNginxConfig, removeNginxConfig, attachNginxToNetwork, reloadNginxConfig} = require('./nginxController')

// Backup directory path
const backupDir = path.join(__dirname, '../../backups');
// Nginx config path
const nginxConfigPath = path.join(__dirname, '../../nginx/conf/default.conf');

// Create a new MySQL and Adminer container
exports.createContainer = async (req, res) => {
  const { userId, dbName, userPassword, keepData } = req.body;
  const mysqlContainerName = `mysql_${userId}`;
  const adminerContainerName = `adminer_${userId}`;
  const networkName = `network_${userId}`; // Unique network for each container pair
  const mysqlVolumeName = `mysql_data_${userId}`; // Volume name for MySQL data

  try {
    // Step 1: Check if a Docker volume for MySQL already exists if keepData is true
    let mysqlVolume;
    if (keepData) {
      try {
        mysqlVolume = await docker.getVolume(mysqlVolumeName).inspect();
        console.log(`Using existing volume: ${mysqlVolumeName}`);
      } catch (error) {
        if (error.reason === 'no such volume') {
          mysqlVolume = await docker.createVolume({ Name: mysqlVolumeName });
          console.log(`Created new volume: ${mysqlVolumeName}`);
        } else {
          throw error;
        }
      }
    }

    // Step 2: Create a Docker network specific to this user
    await docker.createNetwork({ Name: networkName });

    // Step 3: Create the MySQL container in the new network
    const mysqlContainer = await docker.createContainer({
      Image: 'mysql:latest',
      name: mysqlContainerName,
      Env: [
        `MYSQL_ROOT_PASSWORD=${userPassword}`,
        `MYSQL_DATABASE=${dbName}`,
        `MYSQL_USER=${userId}`,
        `MYSQL_PASSWORD=${userPassword}`
      ],
      ExposedPorts: { '3306/tcp': {} }, // Internal port 3306
      HostConfig: {
        NetworkMode: networkName, // Attach to the new isolated Docker network
        Binds: keepData ? [`${mysqlVolumeName}:/var/lib/mysql`] : [] // Conditionally mount the volume
      }
    });

    await mysqlContainer.start();

    // Step 4: Create the Adminer container in the same network
    const adminerContainer = await docker.createContainer({
      Image: 'adminer:latest',
      name: adminerContainerName,
      Env: [
        `ADMINER_DEFAULT_SERVER=${mysqlContainerName}` // Default server for Adminer
      ],
      ExposedPorts: { '8080/tcp': {} }, // Adminer runs on port 8080 internally
      HostConfig: {
        NetworkMode: networkName, // Attach to the same isolated network
      }
    });

    await adminerContainer.start();

    // Step 5: Attach Nginx to the new network
    await attachNginxToNetwork(docker, networkName);

    // Step 6: Update Nginx configuration for path-based routing
    await updateNginxConfig(userId);

    res.status(201).json({
      message: 'MySQL and Adminer containers created successfully',
      mysqlContainerId: mysqlContainer.id,
      adminerContainerId: adminerContainer.id,
      volumeName: keepData ? mysqlVolumeName : null,
      keepData
    });
  } catch (error) {
    console.error('Error creating containers:', error);

    // Check for specific error codes
    if (error.statusCode === 409 && error.json && error.json.message) {
      return res.status(409).json({ error: error.json.message });
    }

    // Default error response
    res.status(500).json({ error: 'Failed to create containers' });
    }
};

// Stop a container
exports.stopContainer = async (req, res) => {
  const { containerId } = req.body;

  try {
    const container = docker.getContainer(containerId);
    await container.stop();
    res.status(200).json({ message: 'Container stopped successfully' });
  } catch (error) {
    console.error('Error stopping container:', error);
    res.status(500).json({ error: 'Failed to stop container' });
  }
};

// Delete both MySQL and Adminer containers and optionally remove the volume
exports.deleteContainer = async (req, res) => {
  const { userId, networkName, removeData } = req.body;
  const mysqlContainerName = `mysql_${userId}`;
  const adminerContainerName = `adminer_${userId}`;
  const nginxContainerName = 'nginx-dbaas'; // Assuming Nginx container is named 'nginx'
  const mysqlVolumeName = `mysql_data_${userId}`; // Volume name for MySQL data

  try {
    // Step 1: Disconnect MySQL and Adminer containers from the network
    const mysqlContainer = docker.getContainer(mysqlContainerName);
    const adminerContainer = docker.getContainer(adminerContainerName);
    const nginxContainer = docker.getContainer(nginxContainerName); // Get the Nginx container

    // Disconnect MySQL, Adminer, and Nginx from the network
    await docker.getNetwork(networkName).disconnect({ Container: mysqlContainer.id, Force: true });
    await docker.getNetwork(networkName).disconnect({ Container: adminerContainer.id, Force: true });
    await docker.getNetwork(networkName).disconnect({ Container: nginxContainer.id, Force: true });

    // Step 2: Remove MySQL container
    await mysqlContainer.remove({ force: true });

    // Step 3: Remove Adminer container
    await adminerContainer.remove({ force: true });

    // Step 4: Optionally remove the Docker volume if removeData is true
    if (removeData) {
      const mysqlVolume = docker.getVolume(mysqlVolumeName);
      await mysqlVolume.remove(); // Remove the volume if removeData is true
      console.log(`Volume ${mysqlVolumeName} removed`);
    } else {
      console.log(`Volume ${mysqlVolumeName} retained`);
    }

    // Step 5: Remove the Docker network
    const network = docker.getNetwork(networkName);
    await network.remove();

    // Step 6: Remove the Nginx configuration for this user
    await removeNginxConfig(userId);

    res.status(200).json({
      message: 'Containers, network, and Nginx configuration deleted successfully',
      removeData
    });
  } catch (error) {
    console.error('Error deleting containers or network:', error);
    res.status(500).json({ error: 'Failed to delete containers or network' });
  }
};

// List all containers related to DBaaS setup
exports.listContainers = async (req, res) => {
  try {
    // Get all containers
    const containers = await docker.listContainers({ all: true });
    
    // Filter containers based on naming convention (mysql_ and adminer_)
    const dbContainers = containers.filter(container => 
      container.Names.some(name => name.includes('mysql_') || name.includes('adminer_'))
    );

    // Group the containers by userId (based on container names)
    const groupedContainers = {};

    dbContainers.forEach(container => {
      const containerName = container.Names[0]; // Get the first name from the array
      const userId = containerName.includes('mysql_')
        ? containerName.replace('/mysql_', '')
        : containerName.replace('/adminer_', '');

      // If userId not yet in groupedContainers, initialize the structure
      if (!groupedContainers[userId]) {
        groupedContainers[userId] = {
          mysql: null,
          adminer: null,
        };
      }

      // Assign container details to the appropriate group
      if (containerName.includes('mysql_')) {
        groupedContainers[userId].mysql = container;
      } else if (containerName.includes('adminer_')) {
        groupedContainers[userId].adminer = container;
      }
    });

    // Send grouped containers in the response
    res.status(200).json(groupedContainers);
  } catch (error) {
    console.error('Error listing containers:', error);
    res.status(500).json({ error: 'Failed to list containers' });
  }
};



