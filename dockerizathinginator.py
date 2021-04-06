import io
import eel
import paramiko
from contextlib import contextmanager

eel.init('web')

# Program goes here
@eel.expose
def test_ssh(host, user, password):
    model = ''
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy()) 
    try:
       ssh.connect(host, username=user, password=password)
       return "connected"
    except Exception as e:
        return "Error: {}".format(str(e))
    finally:
       ssh.close()

@eel.expose
def get_model(host, user, password):
    model = ''
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, username=user, password=password)
        stdin, stdout, stderr = ssh.exec_command('cat /proc/device-tree/model')
        for line in iter(stdout.readline, ''):
            model += line
        return str(model)
    except Exception as e:
        return "Error: {}".format(str(e))
    finally:
        ssh.close()

@eel.expose
def ssh_config_device(host, user, password, vol, log, backup):
    ssh=paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.conenct(host, username=user, password=password)
    except Exception as e:
        return "Error: {}".format(str(e))
    finally:
        ssh.close()

@eel.expose()
def prep_usb(host, user, password, vol):
    device = ''
    ssh=paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    fdisk = ''
    try:
        ssh.connect(host, username=user, password=password)
        stdin, stdout, stderr = ssh.exec_command('sudo fdisk -l')
        for line in iter(stdout.readline, ''):
            fdisk += line
        usb = fdisk.find('sda')
        if usb == -1:
            return("No USB connected")
        else:
            try:
                stdin, stdout, stderr = ssh.exec_command("echo 'Getting USB Info ...' && SIZE=`sudo parted -s /dev/sda print|awk '/^Disk/ {{print $3}}' | sed 's/[Mm] [Bb]//'` && echo 'Wiping USB Device ... ' && sudo wipefs -a -f -q /dev/sda && echo 'Paritioning device ... ' && sudo parted /dev/sda mklabel gpt && sudo parted -a optimal /dev/sda mkpart primary 0% $SIZE && echo 'Formatting device ... ' && sudo mkfs.ext4 -F /dev/sda1 && ID=`sudo blkid | grep sda1 | grep PARTUUID= | awk '/^\/dev\/sda1:/ {{print $5}}'` && echo 'Adding to fstab ... ' && sudo mkdir {} && sudo chown pi:pi {} && sudo echo $ID {} ext4 defaults,noatime 0 1 | sudo tee -a /etc/fstab && echo 'Mounting ... ' && sudo mount {} && echo 'USB Device Ready'".format(vol, vol, vol, vol) )
                for line in iter(stdout.readline, ''):
                    eel.prepUSB(line)
            except Exception as e:
                return "Error: {}".format(str(e))
        return 'true'
    except Exception as e:
        return "Error: {}".format(str(e))
    finally:
        ssh.close()

@eel.expose()
def prep_net_nfs(host, user, password, vol, share):
    ssh=paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, username=user, password=password)
        stdin, stdout, stderr = ssh.exec_command("echo 'Creating Mount Directory ... && sudo mkdir {} && echo 'Mounting Network Share ... && sudo mount -t nfs {} {} && echo 'Adding to fstab ... && echo {} {} nfs auto 0 0 | sudo tee -a /etc/fstab && echo 'Network prepartation complete'".format(vol, share, vol, share, vol))
        for line in iter(stdout.readline, ''):
            eel.netUpdate(line)
        return 'true'
    except Exception as e:
        return "Error: {}".format(str(e))
    finally:
        ssh.close()

@eel.expose()
def prep_net_cifs(host, user, password, vol, share, netUser, netPassword):
    ssh=paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, username=user, password=password)
        stdin, stdout, stderr = ssh.exec_command("PASS='" + netPassword + "' && echo 'Creating Mount Directory ...' && sudo mkdir {} && echo 'Mounting Network Share ...' && sudo mount -t cifs -o username={},password=$PASS {} {} && echo 'Adding to fstab ...' && echo {} {} cifs username={},password=$PASS 0 0 | sudo tee -a /etc/fstab && echo 'Network prepartation complete'".format(vol, netUser, share, vol, share, vol, netUser))
        for line in iter(stdout.readline, ''):
            eel.netUpdate(line)
        return 'true'
    except Exception as e:
        return "Error: {}".format(str(e))
    finally:
        ssh.close()

@eel.expose()
def prep_github(host, user, password, vol, ghUser, ghPass, ghEmail, ghRepo):
    ssh=paramiko.SSHClient()
    ssh.set_missing_host_key_poicy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, username=user, password=password)
        stdin, stdout, stderr = ssh.exec_command("echo 'Installing git ... ' && sudo apt-get update && sudo  apt-get -y install -y git && echo 'Configuring repo ... ' && git init {} && git config --global user.name {} && git config --global user.email {} && git config list && echo 'You will need to complete the remaining parts of configuration manually'".format(vol, ghUser, ghEmail, ))
        for line in iter(stdout.readline, ''):
            eel.gitHubUpdate(line)
        return 'true'
    except Exception as e: 
        return "Error: {}".format(str(e))
    finally:
        ssh.close()

@eel.expose()
def update_pi(host, user, password):
    ssh=paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, username=user, password=password)
        stdin, stdout, stderr = ssh.exec_command('sudo apt-get update && sudo apt-get -y upgrade && sudo apt-get -y dist-upgrade')
        for line in iter(stdout.readline, ''):
            eel.updatePiFunction(line)
        return "true"
    except Exception as e:
        return "Error: {}".format(str(e))
    finally:
        ssh.close()

@eel.expose()
def install_pi(host, user, password, vol):
    ssh=paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, username=user, password=password)
        stdin, stdout, stderr = ssh.exec_command("echo 'Installing git ...' && sudo apt-get -y install git && echo 'Installing Log2Ram ...' && git clone https://github.com/azlux/log2ram.git && chmod +x log2ram/install.sh && cp -r log2ram/build-packages.sh log2ram/install.sh log2ram/log2ram.cron log2ram/log2ram.service log2ram/uninstall.sh log2ram/debian log2ram/log2ram.conf log2ram/log2ram.logrotate . && cp log2ram/log2ram ./log2ram1 && rm -rf log2ram && mv log2ram1 log2ram && sudo ./install.sh && mkdir log2ram-dir && mv *.* log2ram-dir && mv debian log2ram-dir && mv log2ram log2ram-dir && echo 'Installing docker ... ' && curl -sSL https://get.docker.com | sh && sudo usermod -aG docker pi && sudo apt-get -y install libffi-dev libssl-dev python3 python3-pip && sudo apt-get -y remove python-configparser && sudo pip3 install docker-compose && echo 'Finished, Rebooting...' && sudo reboot")
        for line in iter(stdout.readline, ''):
            eel.installSoftware(line)
        eel.sleep(120)
        return "true"
    except Exception as e:
        return "Error: {}".format(str(e))
    finally:
        ssh.close()

@eel.expose()
def install_portainer(host, user, password, vol):
    ssh=paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(host, username=user, password=password)
        stdin, stdout, stderr = ssh.exec_command('echo "Installing Portainer ..." && docker volume create portainer_data && docker run -d -p8000:8000 -p 9000:9000 --restart=always --name=Portainer -v /var/run/docker.sock:/var/run/docker/sock -v portainer_data:{}/portainer portainer/portainer && docker network create docker && echo "You can manage Portainer at {}:9000"'.format(vol, host))
        for line in iter(stdout.readline, ''):
            eel.installPortainer(line)
        return "true"
    except Exception as e:
        return "Error: {}".format(str(e))
    finally:
        ssh.close()

eel.start('index.html', size=(800, 600), port=8888)
