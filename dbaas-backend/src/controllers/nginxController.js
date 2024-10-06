const { NginxConfFile } = require('nginx-conf');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const nginxConfigPath = path.join(__dirname, '../../nginx/conf/default.conf');


// Helper function to attach Nginx to the network
async function attachNginxToNetwork(docker, networkName) {
    try {
      const nginxContainer = docker.getContainer('nginx-dbaas'); // Assuming Nginx container is named 'nginx'
      await docker.getNetwork(networkName).connect({ Container: nginxContainer.id });
      console.log(`Nginx successfully connected to network: ${networkName}`);
    } catch (error) {
      console.error(`Failed to connect Nginx to network ${networkName}: ${error.message}`);
    }
  }
  
  // Helper function to update Nginx configuration
  async function updateNginxConfig(userId) {
    NginxConfFile.create(nginxConfigPath, (err, conf) => {
      if (err) {
        console.error('Failed to load Nginx configuration:', err);
        return;
      }
  
      // Find the server block
      const serverBlock = conf.nginx.server[0];
  
      // Add MySQL location block for this user
      serverBlock._add('location', `/mysql/${userId}/`);
      serverBlock.location[serverBlock.location.length - 1]._add('proxy_pass', `http://mysql_${userId}:3306`);
      serverBlock.location[serverBlock.location.length - 1]._add('proxy_set_header', 'Host $host');
      serverBlock.location[serverBlock.location.length - 1]._add('proxy_set_header', 'X-Real-IP $remote_addr');
      serverBlock.location[serverBlock.location.length - 1]._add('proxy_set_header', 'X-Forwarded-For $proxy_add_x_forwarded_for');
      serverBlock.location[serverBlock.location.length - 1]._add('proxy_set_header', 'X-Forwarded-Proto $scheme');
  
      // Add Adminer location block for this user
      serverBlock._add('location', `/adminer/${userId}/`);
      serverBlock.location[serverBlock.location.length - 1]._add('proxy_pass', `http://adminer_${userId}:8080`);
      serverBlock.location[serverBlock.location.length - 1]._add('proxy_set_header', 'Host $host');
      serverBlock.location[serverBlock.location.length - 1]._add('proxy_set_header', 'X-Real-IP $remote_addr');
      serverBlock.location[serverBlock.location.length - 1]._add('proxy_set_header', 'X-Forwarded-For $proxy_add_x_forwarded_for');
      serverBlock.location[serverBlock.location.length - 1]._add('proxy_set_header', 'X-Forwarded-Proto $scheme');
  
      conf.flush(); // Write the changes to the Nginx config file
      reloadNginx(); // Reload Nginx to apply the changes
    });
  }
  
  // Helper function to remove Nginx configuration
  async function removeNginxConfig(userId) {
    NginxConfFile.create(nginxConfigPath, (err, conf) => {
      if (err) {
        console.error('Failed to load Nginx configuration:', err);
        return;
      }
  
      // Find the server block
      const serverBlock = conf.nginx.server[0];
  
      // Remove MySQL location block for this user
      const mysqlLocationIndex = serverBlock.location.findIndex(loc => loc._value === `/mysql/${userId}/`);
      if (mysqlLocationIndex !== -1) {
        serverBlock._remove('location', mysqlLocationIndex);
      }
  
      // Remove Adminer location block for this user
      const adminerLocationIndex = serverBlock.location.findIndex(loc => loc._value === `/adminer/${userId}/`);
      if (adminerLocationIndex !== -1) {
        serverBlock._remove('location', adminerLocationIndex);
      }
  
      conf.flush(); // Write the changes to the Nginx config file
      reloadNginx(); // Reload Nginx to apply the changes
    });
  }
  
  // Helper function to reload Nginx inside Docker container
  async function reloadNginx() {
    exec('docker exec nginx-dbaas nginx -s reload', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error reloading Nginx: ${error.message}`);
        return;
      }
      if (stderr) {
        console.error(`Nginx reload stderr: ${stderr}`);
      }
      console.log('Nginx reloaded successfully');
    });
  }

  module.exports = {reloadNginx, attachNginxToNetwork, removeNginxConfig, updateNginxConfig}