Need to fix: Nginx routing for mysql services (resolve hostnames)

## Documentation: MySQL and Adminer Container Management with Data Persistence

### Overview

This document explains how to create and remove MySQL and Adminer containers using Docker, with options for persisting or deleting data based on user requirements. The system allows users to manage containers for individual databases and decide whether the data should be retained or deleted upon container removal.

---

### API Endpoints

1. **Create Containers** (`POST /api/containers/create`)
2. **Remove Containers** (`POST /api/containers/delete`)
3. **Stop Containers** (`POST /api/containers/stop`)
4. **List Containers** (`GET /api/containers/list`)

---

### 1. **Creating Containers**

The system allows you to create MySQL and Adminer containers with the following options:

- **Data Persistence**: When creating the containers, you can specify whether you want the data to persist after the containers are removed.
  
#### Endpoint: `POST /api/containers/create`

**Description**: Creates a MySQL container along with an Adminer container. The MySQL container can be configured with or without persistent storage based on the `keepData` flag.

##### Request Payload

```json
{
  "userId": "test_user1",          // Unique user ID to identify the container pair
  "dbName": "testdb",               // Name of the database to create in MySQL
  "userPassword": "password123",    // MySQL root user password
  "keepData": true                  // Flag to indicate if the data should persist after container removal
}
```

- `keepData: true`: A Docker volume will be created to persist the MySQL data.
- `keepData: false`: No Docker volume is created, and the data will not be persisted after container removal.

##### Example `curl` Command

```bash
curl -X POST http://localhost:3000/api/containers/create \
-H "Content-Type: application/json" \
-d '{
  "userId": "test_user1",
  "dbName": "testdb",
  "userPassword": "password123",
  "keepData": true
}'
```

**Response**:

- The containers are created and started.
- The response includes the IDs of the created containers and a confirmation of whether data persistence is enabled.

##### Example Response

```json
{
  "message": "MySQL and Adminer containers created successfully",
  "mysqlContainerId": "mysql-container-id",
  "adminerContainerId": "adminer-container-id",
  "volumeName": "mysql_data_test_user1", 
  "keepData": true
}
```

---

### 2. **Removing Containers**

You can remove both MySQL and Adminer containers and decide whether the data associated with the MySQL container should be kept or deleted. This is controlled by the `removeData` flag.

#### Endpoint: `POST /api/containers/delete`

**Description**: Deletes the MySQL and Adminer containers. You can choose whether the data associated with the MySQL container should be deleted along with the containers or retained for future use.

##### Request Payload

```json
{
  "userId": "test_user1",       // Unique user ID that corresponds to the container pair
  "networkName": "network_test_user1",  // The Docker network associated with the user
  "removeData": true            // Flag to indicate if the Docker volume (data) should be removed
}
```

- `removeData: true`: The Docker volume associated with the MySQL container will be deleted, removing all data.
- `removeData: false`: The Docker volume will be retained, allowing you to recreate the container later with the same data.

##### Example `curl` Command

```bash
curl -X POST http://localhost:3000/api/containers/delete \
-H "Content-Type: application/json" \
-d '{
  "userId": "test_user1",
  "networkName": "network_test_user1",
  "removeData": false
}'
```

**Response**:

- The MySQL and Adminer containers are stopped and removed.
- Based on the `removeData` flag, the volume associated with MySQL data is either deleted or retained.

##### Example Response

```json
{
  "message": "Containers, network, and Nginx configuration deleted successfully",
  "removeData": false
}
```

---

### 3. **Data Persistence Workflow**

The behavior of data persistence is controlled by two flags:

- **`keepData`**: Determines if the MySQL container is created with a persistent volume.
- **`removeData`**: Determines if the persistent volume should be deleted when the containers are removed.

#### **Scenario 1: Creating Containers with Data Persistence**

If you create containers with `keepData: true`, the MySQL container is created with a Docker volume to store its data. This volume ensures that even if the container is removed, the data will be retained.

- **Volume Name**: The volume is created with a name like `mysql_data_<userId>`.
- **Behavior**: When containers are deleted, the volume remains unless `removeData` is set to `true` during deletion.

##### Example: Create a MySQL container with persistent data

```bash
curl -X POST http://localhost:3000/api/containers/create \
-H "Content-Type: application/json" \
-d '{
  "userId": "test_user1",
  "dbName": "testdb",
  "userPassword": "password123",
  "keepData": true
}'
```

This creates the containers with a volume that persists the MySQL data.

#### **Scenario 2: Removing Containers but Keeping Data**

When deleting containers, if `removeData` is set to `false`, the MySQL volume remains intact. This allows you to recreate the MySQL container later with the same data.

##### Example: Remove containers while keeping the data

```bash
curl -X POST http://localhost:3000/api/containers/delete \
-H "Content-Type: application/json" \
-d '{
  "userId": "test_user1",
  "networkName": "network_test_user1",
  "removeData": false
}'
```

This removes the containers but retains the volume (`mysql_data_test_user1`), which keeps the MySQL data.

#### **Scenario 3: Recreating Containers with Existing Data**

If you recreate the containers with `keepData: true` after the previous deletion with `removeData: false`, the system will reuse the existing volume (`mysql_data_test_user1`), allowing the MySQL container to retain the previously stored data.

##### Example: Recreate MySQL container with the retained data

```bash
curl -X POST http://localhost:3000/api/containers/create \
-H "Content-Type: application/json" \
-d '{
  "userId": "test_user1",
  "dbName": "testdb",
  "userPassword": "password123",
  "keepData": true
}'
```

This will bind the recreated container to the existing volume and keep the data intact.

#### **Scenario 4: Removing Containers and Deleting Data**

When deleting containers with `removeData: true`, the volume will be removed, and all data will be lost.

##### Example: Remove containers and delete data

```bash
curl -X POST http://localhost:3000/api/containers/delete \
-H "Content-Type: application/json" \
-d '{
  "userId": "test_user1",
  "networkName": "network_test_user1",
  "removeData": true
}'
```

This deletes both the containers and the volume, ensuring that the data is also deleted.

---

### 4. **Stopping Containers**

To stop a running MySQL or Adminer container without removing it, use the following endpoint.

#### Endpoint: `POST /api/containers/stop`

##### Request Payload

```json
{
  "containerId": "container_id_here"
}
```

##### Example `curl` Command

```bash
curl -X POST http://localhost:3000/api/containers/stop \
-H "Content-Type: application/json" \
-d '{
  "containerId": "mysql_container_id_here"
}'
```

---

### 5. **Listing All Containers**

To list all MySQL and Adminer containers (both running and stopped), use the following endpoint.

#### Endpoint: `GET /api/containers/list`

##### Example `curl` Command

```bash
curl -X GET http://localhost:3000/api/containers/list
```

---

### Conclusion

This system provides flexible options for creating and managing MySQL and Adminer containers, with the ability to persist or delete data based on the user’s requirements. The use of Docker volumes ensures that data can be retained even after containers are removed, and the API allows for easy management of containers and their data.


### **Backup API Endpoints**

#### 1. **Create Backup**

- **URL**: `/api/containers/backup/create`
- **Method**: `POST`
- **Description**: Creates a backup of the MySQL database for a user. The backup is stored in the `./backups/` directory.

##### Request Body:
```json
{
  "userId": "test_user1",
  "dbName": "testdb",
  "userPassword": "password123"
}
```

##### Example `curl` Command:
```bash
curl -X POST http://localhost:3000/api/containers/backup/create \
-H "Content-Type: application/json" \
-d '{
  "userId": "test_user1",
  "dbName": "testdb",
  "userPassword": "password123"
}'
```

---

#### 2. **List Backups**

- **URL**: `/api/containers/backup/list/:userId`
- **Method**: `GET`
- **Description**: Lists all backups for a specific user.

##### Example `curl` Command:
```bash
curl -X GET http://localhost:3000/api/containers/backup/list/test_user1
```

---

#### 3. **Restore Backup**

- **URL**: `/api/containers/backup/restore`
- **Method**: `POST`
- **Description**: Restores a MySQL database from a specified backup file.

##### Request Body:
```json
{
  "userId": "test_user1",
  "backupFile": "backup_test_user1_1696608967875.sql",
  "userPassword": "password123"
}
```

##### Example `curl` Command:
```bash
curl -X POST http://localhost:3000/api/containers/backup/restore \
-H "Content-Type: application/json" \
-d '{
  "userId": "test_user1",
  "backupFile": "backup_test_user1_1696608967875.sql",
  "userPassword": "password123"
}'
```

---

#### 4. **Delete Backup**

- **URL**: `/api/containers/backup/delete`
- **Method**: `POST`
- **Description**: Deletes a specified backup file from the system.

##### Request Body:
```json
{
  "userId": "test_user1",
  "backupFile": "backup_test_user1_1696608967875.sql"
}
```

##### Example `curl` Command:
```bash
curl -X POST http://localhost:3000/api/containers/backup/delete \
-H "Content-Type: application/json" \
-d '{
  "userId": "test_user1",
  "backupFile": "backup_test_user1_1696608967875.sql"
}'
```

---

### **Conclusion**

These endpoints allow you to create, list, restore, and delete backups for MySQL containers in your DBaaS setup.
