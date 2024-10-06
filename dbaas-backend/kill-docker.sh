#!/bin/bash

# Stop all running containers
echo "Stopping all running containers..."
docker stop $(docker ps -q)

# Remove all containers
echo "Removing all containers..."
docker rm $(docker ps -a -q)

# Remove all networks
echo "Removing all unused networks..."
docker network prune -f

# Remove all volumes with prefix 'mysql'
echo "Removing all volumes with prefix 'mysql'..."
docker volume ls -q | grep '^mysql' | xargs -r docker volume rm

echo "All containers, networks, and mysql-prefixed volumes have been removed."
