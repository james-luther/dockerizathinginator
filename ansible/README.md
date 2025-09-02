# Dockerizathinginator Ansible Playbooks

Modern Ansible-based automation for setting up Docker and container stacks on Raspberry Pi 4 systems.

## Features

- **Automated Docker Installation**: Complete Docker Engine and Docker Compose setup
- **Storage Configuration**: Support for USB, NFS, and CIFS/SMB storage backends
- **Container Management**: Portainer deployment for web-based container management
- **Pre-configured Stacks**:
  - **Network Stack**: Pi-hole, Nginx Proxy Manager, Heimdall, UniFi Controller, WireGuard
  - **IoT Stack**: InfluxDB, Mosquitto MQTT, Home Assistant, Grafana, Node-RED, Zigbee2MQTT
  - **Media Stack**: Jellyfin/Plex, NextCloud, Transmission, Sonarr, Radarr, Jackett
- **SD Card Protection**: Automatic Log2Ram installation to reduce SD card wear
- **Idempotent Operations**: Safe to run multiple times

## Prerequisites

### On Your Control Machine
- Ansible 2.9+ installed
- SSH access to your Raspberry Pi
- Python 3.6+

### On Your Raspberry Pi
- Raspberry Pi OS (64-bit recommended for better container support)
- SSH enabled
- Network connectivity
- At least 2GB free disk space
- At least 1GB RAM available

## Quick Start

### 1. Install Ansible on your control machine
```bash
# macOS
brew install ansible

# Ubuntu/Debian
sudo apt update
sudo apt install ansible

# Using pip
pip install ansible
```

### 2. Configure your inventory
Edit `inventory/hosts.yml` with your Raspberry Pi details:
```yaml
all:
  children:
    raspberrypi:
      hosts:
        pi:
          ansible_host: 192.168.1.100  # Your Pi's IP
          ansible_user: pi
          ansible_password: raspberry  # Or use SSH keys
```

### 3. Run the complete setup
```bash
# Full setup with all defaults
ansible-playbook playbooks/main.yml

# With specific options
ansible-playbook playbooks/main.yml \
  -e storage_type=usb \
  -e usb_device=sda \
  -e deploy_network_stack=true \
  -e deploy_iot_stack=true
```

## Individual Playbook Usage

### Install Docker Only
```bash
ansible-playbook playbooks/install-docker.yml
```

### Configure Storage
```bash
# USB Storage
ansible-playbook playbooks/configure-storage.yml \
  -e storage_type=usb \
  -e usb_device=sda \
  -e format_usb=true

# NFS Storage
ansible-playbook playbooks/configure-storage.yml \
  -e storage_type=nfs \
  -e nfs_server=192.168.1.10 \
  -e nfs_path=/export/docker

# CIFS/SMB Storage
ansible-playbook playbooks/configure-storage.yml \
  -e storage_type=cifs \
  -e smb_server=192.168.1.10 \
  -e smb_share=docker \
  -e smb_username=user \
  -e smb_password=pass
```

### Deploy Stacks
```bash
# Deploy Portainer
ansible-playbook playbooks/deploy-portainer.yml

# Deploy Network Stack
ansible-playbook playbooks/deploy-network-stack.yml \
  -e deploy_pihole=true \
  -e deploy_nginx_proxy=true

# Deploy IoT Stack
ansible-playbook playbooks/deploy-iot-stack.yml \
  -e deploy_home_assistant=true \
  -e deploy_mosquitto=true

# Deploy Media Stack
ansible-playbook playbooks/deploy-media-stack.yml \
  -e deploy_jellyfin=true \
  -e deploy_nextcloud=true
```

## Configuration Options

### Storage Types
- `default`: Use default Raspberry Pi storage
- `usb`: External USB drive (recommended)
- `nfs`: Network File System share
- `cifs`: Windows/SMB network share

### Stack Components

#### Network Stack
- `deploy_pihole`: Pi-hole ad blocker
- `deploy_nginx_proxy`: Nginx Proxy Manager
- `deploy_heimdall`: Application dashboard
- `deploy_unifi`: UniFi Controller
- `deploy_wireguard`: WireGuard VPN

#### IoT Stack
- `deploy_influxdb`: Time-series database
- `deploy_mosquitto`: MQTT broker
- `deploy_home_assistant`: Home automation
- `deploy_grafana`: Data visualization
- `deploy_node_red`: Flow-based programming
- `deploy_zigbee2mqtt`: Zigbee bridge

#### Media Stack
- `deploy_jellyfin`: Media server (lighter than Plex)
- `deploy_plex`: Plex media server
- `deploy_nextcloud`: Personal cloud storage
- `deploy_transmission`: BitTorrent client
- `deploy_sonarr`: TV show management
- `deploy_radarr`: Movie management
- `deploy_jackett`: Torrent indexer

## Advanced Usage

### Using Ansible Vault for Passwords
```bash
# Create encrypted variables file
ansible-vault create group_vars/raspberrypi/vault.yml

# Add sensitive variables
ansible_password: your_secure_password
smb_password: your_smb_password

# Run playbook with vault
ansible-playbook playbooks/main.yml --ask-vault-pass
```

### Custom Variables File
Create a `vars.yml` file:
```yaml
volume_path: /mnt/storage
storage_type: nfs
nfs_server: 192.168.1.10
nfs_path: /volume1/docker
deploy_network_stack: true
deploy_iot_stack: true
timezone: America/New_York
```

Run with:
```bash
ansible-playbook playbooks/main.yml -e @vars.yml
```

### Targeting Specific Hosts
```bash
# Single host
ansible-playbook playbooks/main.yml --limit pi

# Multiple hosts
ansible-playbook playbooks/main.yml --limit "pi-living-room,pi-bedroom"

# Pattern matching
ansible-playbook playbooks/main.yml --limit "pi-*"
```

## Service Access

After deployment, services are accessible at:

| Service | URL | Default Credentials |
|---------|-----|-------------------|
| Portainer | http://[pi-ip]:9000 | Set on first login |
| Pi-hole | http://[pi-ip]/admin | Check credentials file |
| Nginx Proxy Manager | http://[pi-ip]:81 | admin@example.com / changeme |
| Heimdall | http://[pi-ip]:8090 | None |
| Home Assistant | http://[pi-ip]:8123 | Set on first login |
| Grafana | http://[pi-ip]:3000 | admin / [generated] |
| InfluxDB | http://[pi-ip]:8086 | admin / [generated] |
| Jellyfin | http://[pi-ip]:8096 | Set on first login |
| NextCloud | http://[pi-ip]:8080 | admin / [generated] |

Credentials are saved in `/mnt/docker/config/` on the Raspberry Pi.

## Troubleshooting

### SSH Connection Issues
```bash
# Test connection
ansible raspberrypi -m ping

# Verbose output
ansible-playbook playbooks/main.yml -vvv
```

### Docker Installation Failed
```bash
# Check Docker status
ansible raspberrypi -a "docker --version"
ansible raspberrypi -a "systemctl status docker"
```

### Storage Not Mounting
```bash
# Check mount status
ansible raspberrypi -a "df -h /mnt/docker"
ansible raspberrypi -a "lsblk"
```

### Container Not Starting
```bash
# Check container logs
ansible raspberrypi -a "docker logs [container_name]"
ansible raspberrypi -a "docker ps -a"
```

## Backup and Recovery

### Backup Configuration
```bash
# Backup all container data
ansible raspberrypi -a "tar czf /tmp/docker-backup.tar.gz /mnt/docker"

# Copy backup to local machine
ansible raspberrypi -m fetch -a "src=/tmp/docker-backup.tar.gz dest=./backups/"
```

### Restore Configuration
```bash
# Copy backup to Pi
ansible raspberrypi -m copy -a "src=./backups/docker-backup.tar.gz dest=/tmp/"

# Restore backup
ansible raspberrypi -a "tar xzf /tmp/docker-backup.tar.gz -C /"
```

## Security Considerations

1. **Change Default Passwords**: Always change default passwords after deployment
2. **Use SSH Keys**: Prefer SSH key authentication over passwords
3. **Firewall Rules**: Consider implementing firewall rules for exposed services
4. **Regular Updates**: Keep your Raspberry Pi OS and containers updated
5. **Backup Regularly**: Implement regular backup strategies for your data

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

This project is licensed under the GPLv3 License.