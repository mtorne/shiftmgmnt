# Employee Shift Management System - Deployment Guide

## Overview

This document provides comprehensive instructions for deploying the Employee Shift Management System in a cloud VM environment. The application is fully containerized using Docker and Docker Compose, making it easy to install, configure, and manage.

## Prerequisites

- A cloud VM with:
  - Ubuntu 20.04 LTS or newer
  - At least 2 CPU cores
  - Minimum 4GB RAM
  - At least 20GB storage
- Docker Engine (version 20.10+)
- Docker Compose (version 2.0+)
- Git (for cloning the repository)

## Installation Steps

### 1. Set Up the Cloud VM

1. Provision a cloud VM with the recommended specifications
2. Connect to your VM via SSH
3. Update the system packages:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

### 2. Install Docker and Docker Compose

```bash
# Install Docker
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Add your user to the docker group
sudo usermod -aG docker ${USER}
su - ${USER}

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.18.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### 3. Clone the Repository

```bash
git clone https://github.com/your-organization/employee-shift-management.git
cd employee-shift-management
```

### 4. Configure Environment Variables

Create a `.env` file in the project root directory:

```bash
touch .env
```

Edit the `.env` file with your preferred text editor and add the following variables:

```
# Database Configuration
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_USER=postgres
POSTGRES_DB=employee_shift_management

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=24h

# pgAdmin (optional)
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=your_pgadmin_password_here

# Application Settings
NODE_ENV=production
```

Replace the placeholder values with secure passwords and secrets.

### 5. Deploy the Application

Start all services using Docker Compose:

```bash
docker-compose up -d
```

This command will:
- Build the backend and frontend Docker images
- Create and start all containers
- Set up the PostgreSQL database with the initial schema
- Configure networking between services

### 6. Verify Deployment

Check that all containers are running:

```bash
docker-compose ps
```

You should see all services (backend, frontend, postgres, and optionally pgadmin) with status "Up".

### 7. Access the Application

- **Main Application**: http://your-server-ip
- **API Endpoints**: http://your-server-ip:3000/api
- **pgAdmin** (if enabled): http://your-server-ip:5050

### 8. Initial Login

Use the default admin credentials to log in:
- Username: admin
- Password: admin123

**Important**: Change the default admin password immediately after the first login.

## Maintenance and Operations

### Updating the Application

To update the application to a new version:

```bash
# Pull the latest code
git pull

# Rebuild and restart the containers
docker-compose down
docker-compose build
docker-compose up -d
```

### Backing Up the Database

Create a backup of the PostgreSQL database:

```bash
docker exec -t esm-postgres pg_dump -U postgres employee_shift_management > backup_$(date +%Y-%m-%d_%H-%M-%S).sql
```

### Restoring the Database

Restore from a backup file:

```bash
cat your_backup_file.sql | docker exec -i esm-postgres psql -U postgres -d employee_shift_management
```

### Viewing Logs

View logs for all services:

```bash
docker-compose logs
```

View logs for a specific service:

```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

### Scaling the Application

For higher load scenarios, you can scale the backend service:

```bash
docker-compose up -d --scale backend=3
```

Note: Additional configuration of a load balancer may be required for proper scaling.

## Troubleshooting

### Container Fails to Start

Check the logs for the failing container:

```bash
docker-compose logs [service_name]
```

### Database Connection Issues

Verify the database is running and accessible:

```bash
docker exec -it esm-postgres psql -U postgres -d employee_shift_management -c "SELECT 1;"
```

### Frontend Cannot Connect to Backend

Check that the backend service is running and that the frontend is configured with the correct API URL:

```bash
docker-compose logs frontend
docker-compose logs backend
```

## Security Considerations

- Change all default passwords immediately after deployment
- Consider setting up HTTPS using a reverse proxy like Nginx with Let's Encrypt
- Regularly update the application and all dependencies
- Implement regular database backups
- Consider disabling pgAdmin in production environments or restricting access to it

## Conclusion

The Employee Shift Management System is now deployed and ready for use. The containerized architecture ensures easy maintenance and updates, while the PostgreSQL database provides robust data storage with automated initialization.

For additional support or questions, please contact the system administrator or refer to the project documentation.
