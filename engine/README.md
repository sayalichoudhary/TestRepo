# APIDefender
APID is a product capable of detecting OWASP Top 10 like attacks to APIs in real-time.

Table of contents
=========================

* [APIDefender](#apidefender)
* [ APIDefender Product Installation Guide](#apidefender-product-installation-guide)
  * [Overview](#overview)
  * [Audience](#audience)
  * [APID Product Components](#apid-product-components)
  * [Product Installation Prerequisites](#product-installation-prerequisites)
  * [Installation Overview - 6 Simple Steps](#installationOverview)
  * [Step 1: Initial Setup - Linux Environment](#initialSetup)
    * [ Create a New User](#create-a-new-user)
    * [Sudo Privileges](#sudo-privileges)
    * [Add Public Key Authentication](#add-public-key-authentication)
    * [Set Up a Basic Firewall](#set-up-a-basic-firewall)
  * [Step 2: Install and Configure Nginx](#installAndConfigure)
    * [Install Nginx](#install-nginx)
    * [Check the Web Server](#check-the-web-server)
    * [Manage the Nginx Process](#manage-the-nginx-process)
    * [Change the pid path in nginx.service file](#changeThePid)
    * [Securing APID’s  management APIS using basic authentication](#securingApid)
  * [Step 3: Install and Configure Redis](#configureRedis)
    * [Install Redis](#install-redis)
  * [Step 4: Node.js](#nodejs)
    * [Install Node.js](#installNodejs)
  * [Step 5: Install and Launch the Product](#launch)
    * [Launching APID Engine](#launching-apid-engine)
    * [Install PM2](#install-pm2)
  * [Step 6: Splunk Setup](#splunkSetup)
    * [Create Splunk Account - Cloud Service](#createSplunk)
    * [Setup Universal Forwarder](#setup-universal-forwarder)
    * [Add Forwarder on Splunk account](#add-forwarder-on-splunk-account)
    * [Create a Dashboard](#create-a-dashboard)
  * [References](#references)
* [APIDefender Product Quick Start Guide](#apidefender-product-quick-start-guide)
  * [Overview](#overview1)
  * [Audience](#audience1)
  * [Execution Overview - 5 Simple Steps](#executionOverview)
  * [Step 1: Create APID Domain.](#createApid)
  * [Step 2: Get API Domain and Upload identity policy](#identityPolicy)
  * [Step 3: Upload certificates](#uploadCerts)
  * [Step 4: Upload policy files for rules](#uploadPolicy)
  * [Step 5: Check with real API flow.](#realApiFlow)
  * [Postman Collection Link for APID](#postman-collection-link-for-apid)
* [License](#license)


# APIDefender Product Installation Guide

## Overview

This document provides an installation guide for installing APID on your cloud environment.

An alternate method to install APID if you are using a VM machine is replacing your VM with the snapshot that will be provided. For more information regarding this read the Installation guide using snapshot documentation

## Audience
This documentation is primarily for system administrators, DevOps and CloudOps engineers, and application developers who intend to secure their APIs by integrating APID as secure layer on top their application tier. To install APID with an ease, the user should possess some know-how about the Linux Operating System.

## APID Product Components
![](images/APIDflowDiagram.jpg)

## Product Installation Prerequisites
| Sr. no | Prerequisites | Reference |
| ------ | ------ | ------ |
|1.|Ubuntu 14.0 Or Higher|https://www.digitalocean.com/community/tutorials/how-to-install-linux-apache-mysql-php-lamp-stack-on-ubuntu-16-04|
|2.|Postman Client|https://www.getpostman.com/docs/postman/launching_postman/installation_and_updates|
|3.|Curl and Wget Linux Tools|
|4.|Node.js v6.x|Installation steps given in this document.|
|5.|Redis Cache v4.0.2|Installation steps given in this document.|

 <a name="installationOverview"></a> 
 ## Installation Overview - 6 Simple Steps 

|Steps|Summary|
|-----|-------|
|**Step 1:** Prepare Linux Environment| APIDefender runs on a Ubuntu Linux environment. This can be a virtual-machine or a bare-metal environment. In this step, we create Linux users, and secure VM with a firewall etc.
|**Step 2:** Install and Configure Nginx|API Defender uses Nginx as the “reverse proxy” to terminate inbound HTTPS connections. In this step, we install and configure Nginx to suit the APID requirements.
|**Step 3:**|APID uses Redis to store the API policies and runtime metrics. In this step, we install and secure Redis.
|**Step 4:**|The APID engine is built in NodeJS. The non-blocking nature of I/O in NodeJS provides us with a high performance platform for this engine. In this step, we install Node.js and allied tools.
|**Step 5:**|In this step, we launch the APID Engine and perform a quick sanity test on the same.
|**Step 6:**|APID generates logs for all API traffic violations. We recommend the use of Splunk for aggregation and visualization of those logs. In this step, we setup the Splunk forwarder and dashboards.

<a name="initialSetup"></a>
## Step 1: Initial Setup - Linux Environment
### Root Login
Create a new Ubuntu server and login as the root user using the following command:
```sh
$ ssh root@your_server_ip
```
Complete the login process by accepting the warning about host authenticity.
### Create a New User
Once you are logged in as root, we're prepared to add the new user account that can be used to log-in from here on.
```sh
$ adduser username
```
Enter a strong password and, optionally fill in any of the additional information if you would like.
### Sudo Privileges
Now, we have a new user account with regular account privileges. We can set up root privileges for our normal account so that normal user can run commands with administrative privileges.
As root, run this command to add new user to the sudo group:
```sh
$ usermod -aG sudo username
```
### Add Public Key Authentication
The next step in securing your server is to set up public key authentication for your new user.  To enable the use of SSH key to authenticate as the new remote user, you must add the public key to a special file in the user's home directory.

On the server, as the root user, enter the following command to temporarily switch to the new user:
```sh
$ su - username
```
Now you will be in your new user's home directory.
Create a new directory called .ssh and restrict its permissions with the following commands:
```sh
$ mkdir ~/.ssh
$ chmod 700 ~/.ssh
```
Now open a file under .ssh directory called authorized_keys with a text editor. We will use nano to edit the file:
```sh
$ nano ~/.ssh/authorized_keys
```
Enter the public key in this file and then restrict the permissions of the authorized_keys file with this command:
```sh
$ chmod 600 ~/.ssh/authorized_keys
 ```
Type this command once to return to the root user:
```sh
$ nano ~/.ssh/authorized_keys
```
Now your public key is installed, and you can use SSH keys to log in as your user.

### Set Up a Basic Firewall
To make sure only connections to certain services are allowed, Ubuntu servers can use the UFW firewall. Different applications can register their profiles with UFW upon installation.
```sh
$ sudo ufw app list
```
We can see the output like this:
```sh
Available applications:
  OpenSSH
 ```
To log back in next time, we need to make sure that the firewall allows SSH connections by typing:
 ```sh
$ sudo ufw allow OpenSSH
```
Enable the firewall by typing:
```sh
$ sudo ufw enable
```
By using the below command, we can see that SSH connections are still allowed:
```sh
$ sudo ufw status
 ```
We can see output like this:
```sh
Status: active
To                    Action       From
-----                 ------       -----
OpenSSH               ALLOW        Anywhere
OpenSSH (v6)          ALLOW        Anywhere (v6)
```
After installing and configuring additional services, you will need to adjust the firewall settings to allow acceptable traffic in.
To allow all incoming HTTP (port 80) connections run this command:
```sh
$ sudo ufw allow http  or  $ sudo ufw allow 80
```
To allow all incoming HTTPS (port 443) connections run this command:
```sh
$ sudo ufw allow https  or  $ sudo ufw allow 443
```
<a name="installAndConfigure"></a>
## Step 2: Install and Configure Nginx
### Install Nginx
Update local package index before we begin so that we are using the most up-to-date information:
```sh
$ sudo apt-get update
```
Afterwards, we will install nginx by using the command:
```sh
$ sudo apt-get install nginx
 ```
### Check the Web Server
Nginx automatically starts when it is installed. You can access the default Nginx landing page to confirm that the software is running properly by visiting your server's domain name or public IP address in your web browser:
**http://server_domain_name_or_IP**

You should see the default Nginx landing page, which should look something like this.
This is the default page included with Nginx to show you that the server is installed correctly.
![alt text](images/WelcomeToNginx.png)

### Manage the Nginx Process
Here are some basic management commands to stop, start and restart web server:
```sh
$ sudo service nginx stop
$ sudo service nginx start
$ sudo service nginx restart
```
We can make sure that our web server will restart automatically when the server is rebooted by typing:
```sh
$ sudo update-rc.d nginx defaults
```
This should already be enabled by default, so you may see a message like this:
```sh
“System start/stop links for /etc/init.d/nginx already exist.”
 ```
Make a local nginx folder to add conf.d directory under it
Make a directory named ‘nginx’ under root and navigate to that directory:
```sh
$ cd ~
$ mkdir nginx
$ cd nginx
```
Create another directory named ‘conf.d’ under nginx directory:
```sh
$ mkdir conf.d
```
Edit the default nginx.conf file to make APIDefender work on https protocol
Go to /usr/local/etc/nginx:
```sh
$ cd /usr/local/etc/nginx
```
Open the ‘nginx.conf’ file and comment out the following lines in your nginx.conf
```sh
#user  nobody;
 worker_processes  1;

#error_log  logs/error.log;
#error_log  logs/error.log  notice;
#error_log  logs/error.log  info;

pid      /nginx/nginx.pid; (Copy this pid path)
events {
    worker_connections  1024;
}

http  {
    #include       mime.types;
    #default_type  application/octet-stream;

    #log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
    #                  '$status $body_bytes_sent "$http_referer" '
    #                  '"$http_user_agent" "$http_x_forwarded_for"';
    #
    #
    #  … (Comment all the lines further)
        #
    (except) include /nginx/conf.d/*;
}
```
Copy the pid path from the nginx.conf file.
Save and close the file.

<a name="changeThePid"></a>
### Change the pid path in nginx.service file
Open the nginx.service file using the following command:
```sh
 $ sudo vi /lib/systemd/system/nginx.service
```
Paste the pid path at the lines mentioned below in this file:
```sh
# Stop dance for nginx
# =======================
#
# ExecStop sends SIGSTOP (graceful stop) to the nginx process.
# If, after 5s (--retry QUIT/5) nginx is still running, systemd takes control
# and sends SIGTERM (fast shutdown) to the main process.
# After another 5s (TimeoutStopSec=5), and if nginx is alive, systemd sends
# SIGKILL to all the remaining processes in the process group (KillMode=mixed).
#
# nginx signals reference doc:
# http://nginx.org/en/docs/control.html

[Unit]
Description=A high performance web server and a reverse proxy server
After=network.target

[Service]
Type=forking
PIDFile= /nginx/nginx.pid (Paste the copied pid path here)
ExecStartPre=/usr/sbin/nginx -t -q -g 'daemon on; master_process on;'
ExecStart=/usr/sbin/nginx -g 'daemon on; master_process on;'
ExecReload=/usr/sbin/nginx -g 'daemon on; master_process on;' -s reload
ExecStop=-/sbin/start-stop-daemon --quiet --stop --retry QUIT/5 --pidfile /nginx/nginx.pid (Paste the copied pid path here)
TimeoutStopSec=5
KillMode=mixed

[Install]
WantedBy=multi-user.target
~
~
```
Reload nginx service:
```sh
 $ sudo systemctl daemon-reload
```
<a name="securingApid"></a>
### Securing APID’s  management APIS using basic authentication
#### Create a password file to store credentials for implementing basic authentication
Verify that apache2-utils are installed.Create a password file and a first user by running, the htpasswd utility with the -c flag and type-in the path to the file as the first argument, and the user name as the second argument:
```sh
    $ sudo htpasswd -c/etc/apache2/.htpasswd user1
```
When you press Enter, you will be prompted to type-in a password for user1 twice.
Type-in your password twice and the ‘.htpasswd’ file will get created containing your credentials.

#### Configuring Nginx to make management APIs to work on HTTPS with Basic-Auth
Navigate to /nginx/conf.d directory which you have recently created:
```sh
 $ cd /nginx/conf.d
```
Create a config file with the name ‘ApiMgt’ and ‘.conf’ extension.
Include the following configurations ‘ApiMgt.conf’ file:
```sh
server {

        listen 443 ssl;
        server_name  api-mgt;

        ssl_certificate      /Opensslcerts/server.crt; (Specify the path of your certificate in your machine)
               ssl_certificate_key  /Opensslcerts/server.key; (Specify the path of your private key file in your machine)

         location /apidefender {
           proxy_pass http://127.0.0.1:3000;
           proxy_set_header        Host    $host;
           proxy_set_header Accept-Language "application/json";
           proxy_set_header Accept-Encoding "";
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_set_header X-Forwarded-For $remote_addr;

           auth_basic "Restricted Area";
           auth_basic_user_file /etc/apache2/.htpasswd;
        }
 }
```
Save the file and restart nginx:
```sh
 $ sudo service nginx restart
```
<a name="configureRedis"></a>
## Step 3: Install and Configure Redis
Resynchronize the package index files from their sources install the newest versions of all packages that are currently installed on your server by using the following commands:
```sh
$ sudo apt-get update
$ sudo apt-get upgrade
```
Once the upgrade is completed you can move on to the next step.
### Install Redis
Run the command below to install Redis on your machine
```sh
$ sudo apt-get install redis-server
```
You can see your Redis version by typing:
```sh
$ redis-server --version
```
Start and check your Redis server status with the following commands:
```sh
$ systemctl start redis-server
$ systemctl status redis-server.service
```
For testing your Redis server you can follow the instruction below:
```sh
$ redis-cli
> set test “HugeServer”
> get test
```
The answer should be “HugeServer”.

<a name="nodejs"></a>
## Step 4: Node.js
<a name="installNodejs"></a>
### Install Node.js

Install Node.js 6.x , which is the current version of Node.js, run the commands below:
```sh
$ curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
$ sudo apt-get install -y nodejs
```
To verify the NodeJS installed correctly, run following commands.
 ```sh
$ node -v
v6.11.3
$ npm --version
3.10.10
```
<a name="launch"></a>
## Step 5: Install and Launch the Product
Clone The Product Source
```sh
$ git clone https://mobileasap.unfuddle.com/git/mobileasap_tiengine/
(Master)
```
Install NodeJS Dependencies
Navigate to the ‘ti_engine’ directory of your code and Install the node dependencies using the command:
```sh
npm install
```
### Launching APID Engine
### Install PM2
The latest PM2 stable version is installable via NPM:
 ```sh
$ npm install pm2@latest -g
```
PM2 is the production process manager for APID. It is used to keep APID alive forever, to reload it without downtime and to facilitate common system admin tasks.
Launch APID with PM2 to make it ready for handling real traffic efficiently.The simplest way to start is, to daemonize and monitor APID application is by using this command line:
```sh
$ pm2 start app.js --name processName
 ```
Restarting PM2 with the processes you manage on server boot/reboot is critical. To solve this, PM2 can generate startup scripts and configure them in order to keep your process list intact across expected or unexpected machine restarts.
Just run this command to generate an active startup script: (Note: This step is purely optional.Skip this part if you don’t want to create a startup script)
```sh
$ pm2 startup
 ```
The output expected after running the above command are the steps to setup a startup script. Follow the steps and type-in the configurations accordingly:
 ```sh
Output:
[PM2] Init System found: systemd
[PM2] To setup the Startup Script, copy/paste the following command:
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u apiduser --hp /home/apiduse
 ```
After running the command mentioned above:
```sh
...[PM2] Init System found: systemd
Platform systemd
Template

[Unit]
Description=PM2 process manager
Documentation=https://pm2.keymetrics.io/
After=network.target ..
 ```
<a name="splunkSetup"></a>
## Step 6: Splunk Setup
<a name="createSplunk"></a>
### Create Splunk Account - Cloud Service
Go to https://www.splunk.com/ and create a free Splunk account. By following all necessary steps, user gets **Splunk Cloud URL** which we use in forwarder setting.
### Setup Universal Forwarder
The universal forwarder collects data from a data source or another forwarder and sends it to a forwarder or a Splunk deployment. With a universal forwarder, you can send data to Splunk Enterprise, Splunk Light, or Splunk Cloud. The universal forwarder is available as a separate installation package.

Download Universal forwarder:
```sh
$ wget -O splunkforwarder-6.4.1-debde650d26e-Linux-x86_64.tgz 'https://www.splunk.com/bin/splunk/DownloadActivityServlet?architecture=x86_64&platform=linux&version=6.4.1&product=universalforwarder&filename=splunkforwarder-6.4.1-debde650d26e-Linux-x86_64.tgz&wget=true'
 ```
Install Universal forwarder on /opt/splunkforwarder/.
Use the following command:
```sh
$ sudo tar xvzf splunkforwarder-6.4.0-f2c836328108-Linux-x86_64.tgz -C /opt
```
Navigate to /opt/splunkforwarder/bin directory.
```sh
$ cd /opt/splunkforwarder/bin
```
Run Universal forwarder using this cmd.
```sh
$ sudo ./splunk start --accept-license
```
To enable Universal forwarder at boot time, use following cmd.
```sh
$ sudo ./splunk enable boot-start
```
Configure Forwarder connection to Index Server:
```sh
$ sudo ./splunk add forward-server hostname.domain:9997 -auth admin:changeme
```
Add Data to Splunk account by mentioning the path for Logs directory:
```sh
$ sudo ./splunk add monitor Path for your logs dir  -index index-name -sourcetype source-type-name
```
Deploy-Client, enter the splunk URL which you have got by creating a splunk account:
```sh
 $ sudo ./splunk set deploy-poll Splunk Cloud URL:8089
```
Restart Splunk:
```sh
$ sudo ./splunk restart
```
### Add Forwarder on Splunk account
Use the Splunk Web to add forwarder in our splunk instance. Log in to Splunk Web using the administrative account and go to Settings >Add Data (From Left Panel).
![alt text](images/AddForwarder.png)

Select ‘Forward’ option from the Add Data page.
![alt text](images/SelectForwardOption.png)

Select the forwarder which you have recently created on your machine.
![alt text](images/SelectForwarder.png)

On next page, select ‘Files and Directories’ option and add path for your Log files.
![alt text](images/AddFilesAndDirectories.png)

In next step, select appropriate ‘Source Type’ and ‘Index’ and Click on Review to verify all the details. Then just click on ‘Submit’ to push the details.
Once your File input has been created successfully, you can start searching by click on ‘start search’ option or by simply go to the ‘Search & reporting’ app listed in the toolbar.

### Create a Dashboard

To create a dashboard you need to use the splunk web only where you have already logged in. Select ‘Dashboards’ from the Splunk toolbar and click on ‘Create new Dashboard’ and give the suitable name to it.

You can Edit the newly created  dashboard using UI or Source in order to configure as per your need.
(todo: add screenshot)

After adding all necessary inputs, save the changes and your dashboard will be ready  to use. You can analyse your requests/response by hitting respective APIs using REST client (like Postman) and using newly created dashboard.

## References
* http://www.apidefender.com/
* https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-14-04-lts
* http://pm2.keymetrics.io/docs/usage/quick-start/
* https://www.hugeserver.com/kb/install-redis-debian-ubuntu/
* http://docs.splunk.com/Documentation/Forwarder/7.0.0/Forwarder/Configuretheuniversalforwarder
* https://www.splunk.com/
* https://www.digitalocean.com/community/tutorials/how-to-set-up-a-firewall-with-ufw-on-ubuntu-14-04
* http://www.apidefender.com/
* http://pm2.keymetrics.io/docs/usage/quick-start/

<a name="splunkSetup"></a>
# APIDefender Product Quick Start Guide

<a name="overview1"></a>
## Overview

This document provides a quick start recipe for executing APID to secure your application.

<a name="audience1"></a>
## Audience

This documentation is primarily for application developers who intend to secure their APIs by adding security patterns using APID. To deploy APID with an ease, the user should possess some know-how in Node.js , Linux tools like curl and Postman Client.

<a name="executionOverview"></a>
## Execution Overview - 5 Simple Steps

|Steps|Summary|
|-----|-------|
|**Step 1:** Create APID domain  |Creation of an APIDomain with different configurations to apply on user’s application. We follow this step for basic APIDomain creation.
|**Step 2:**   Get API Domain and Upload identity policy|Get apidomain config for an enterprise or for a particular APIDomain Id to check for ‘ID’ field. If we specify an auth mechanism in the ID field while creation of APIDomain, we need to follow this step to upload an identity file. Here if there is no ID present in APID configs we can skip this step.|
|**Step 3:** Upload ssl certificates |ApiDefender provides management APIs to upload SSL certificates and private keys for SSL-enabled APIDomains. Hence if the APIDomain has a target port on 443 we follow this step to upload SSL certificate and key.|
|**Step 4:** Upload policy files for applying rules|Security policy is a list of rulesets applicable to application in an enterprise. Hence to apply these rulesets we need to upload a policy file|
|**Step 5:** Check with real API flow.|We check with real traffic for user’s API, that the configurations applied is valid.|

<a name="createApid"></a>
## Step-1: Create APID Domain.
In order to use APID for securing your application APIs we need to create a APID domain that consists a list of configurations to be applied.

To add a APID domain

|API Params|Details|
|----------|-------|
|URL|/apidefender/apidomain|
|Method|POST|
|Request Headers|Content-type: application/json, Authorization: Basic <auth token>|
|Request|APIDomain configurations in JSON with apidomain id as null. Multiple apidomain configs can be passed in single configuration request. If we need to specify an authentication mechanism for our domain we can specify it in the “ID” field (For e.g: ‘BasicAuthID’ or ‘OAuthID’).|
|Response|APIDomain ids are generated and added to each config object above.|
|Curl command|curl -XPOST -H 'Authorization: Basic {token}' -H "Content-type: application/json" -d '{ "apiDomainId": "null", "enterpriseName": " MobileO2", "entId": "ent001", "app_name": "API", "appId": "app001", "category": "", "request_domain": "ocs-test.mobileo2.com", "request_path": "^(\/ocs\/.{2,}[.]php\/apps\/files_sharing\/api\/.{2,}\/shares).*", "target": "mobileo2-prod.apigee.net", "target_port": 80, "target_path": "/ocs/v1.php/apps/files_sharing/api/v1/shares", "ssl_certificate_name": "", "ssl_key_name": "",  "ID" : "" }' '     https://{{your-mgt-server}}/apidefender/apidomain'|

Request Body params:

|Param Name|Description|Required? |Example Value|
|----------|-----------|-----------|------------|
|enterpriseName|Enterprise Name|Yes|MobileO2|
entId|Enterprise Id|Yes|ent001|
|app_name|Application Name|Yes|OwnCloud|
|appId|Application Id|Yes|app001|
|request_domain|Enterprise domain name. (Important)|Yes|ocs-prod.mobileo2.com
|request_path|Regular expression to match request path. (Important)|Yes|^(/.{2,}\/apis).*|
|target|Target API domain|Yes|mobileo2-prod.apigee.com|
|target_port|Target API port, 80/443|Yes|80 OR 443
|target_path|Target API path|Yes| /ocs/v1.php/apps/files_sharing/api/v1/shares
|ID|ID module name to enable basic authentication|Optional|BasicAuthID
|ssl_certificate_name support.|SSL certificate name for HTTPS|Optional|g2_g1_bundle.crt|
|ssl_key_name|SSL Key file name for HTTPS support|Optional|mobileo2.com.key|

 Sample Response body:

```sh
{
“status”: “success”,
“statusCode”: “200”,
“apidomainConfigs”:{
 {
    "apidomainId": apidomain001,
    "enterpriseName": "MobileO2",
    "entId": "ent001",
    "app_name": "API",
    "appId": "app001",
    "category": "",
    "request_domain": "ocs-test.mobileo2.com",
    "request_path":"^(\/ocs\/.{2,}[.]php\/apps\/files_sharing\/api\/.{2,}\/shares).*",
    "target": "mobileo2-prod.apigee.net",
    "target_port": 80,
    "target_path": "/ocs/v1.php/apps/files_sharing/api/v1/shares",
    "ID": ""
  },
“message”: “APIDomain config added successfully”
}
```
<a name="identityPolicy"></a>
## Step 2: Get API Domain and Upload identity policy
Check the newly created API Domain configuration by invoking Get Api Domain API for an enterprise or for a particular apidomain id.

To Get a API Domain,

|API Params|Details|
|----------|-------|
|URL|/apidefender/apidomain/entId/{enterpriseId} ( Get apidomains by enterprise ID ), /apidefender/apidomain/apidomainId/{apidomainId} ( Get apidomain by apidomain ID )|
|Method|GET|
|Request Headers | Authorization: Basic <auth token> |
|Request| Enterprise id or apidomain id in request URL.|
|Response| APIDomain configs are fetched based on enterprise ID or apiDomain ID|
|Curl command|curl -X GET https://{{your-mgt-server}}/apidefender/apidomain/apidomainid/{{your-apidomainId}} -H 'authorization: Basic {{token}}' Or curl -X GET https://{{your-mgt-server}}/apidefender/apidomain/entid/{{your-entId}} 'authorization: Basic {{token}}' |

Sample Response Body:

```sh

{
“status”: “success”,
“statusCode”: “200”,
“apidomainConfigs”: {
 {
    "apidomainId": apidomain001,
    "enterpriseName": "MobileO2",
    "entId": "ent001",
    "app_name": "API",
    "appId": "app001",
    "category": "",
    "request_domain": "ocs-test.mobileo2.com",
    "request_path":"^(\/ocs\/.{2,}[.]php\/apps\/files_sharing\/api\/.{2,}\/shares).*",
    "target": "mobileo2-prod.apigee.net",
    "target_port": 80,
    "target_path": "/ocs/v1.php/apps/files_sharing/api/v1/shares",
    "ID": ""
  }
},
“message”: “APIDomain config for apidomain id apidomain001”
}
```
### Upload identity policy
If API domain is configured to enable basic Authentication(i.e ID = “BasicAuthID” in your API domain config) then we need to upload an identity policy file.
Check whether ID is present in APID configs by using get APID domain API. If ID is not present then you can skip this step.

To add an identity file:

|API Params| Details|
|----------|-------|
|URL|/apidefender/identity|
|Method|POST |
|Request Headers |Authorization: Basic <auth token>|
|Request|A Identity file.|
|Curl command| curl -X POST https://{{your-mgt-server}}/apidefender/identity -H 'authorization: Basic {{token}}' -F files=@/var/local/identity.xml

Sample Identity File:
```sh
<?xml version="1.0" encoding="UTF-8"?>
<identity>
<enterprisetipolicy id="ent001" isenabled="true">
<applicationtipolicy id="app001" isenabled="true">
<identityKey id="BasicAuth">
   <key id="Basic AXByoiKIOd8YPLoTLKNjEKsM9">user215< /key>
<key id="Basic fXByoiKIYOPTLKEKs==">admin< /key>
<  /identityKey>
 < /applicationtipolicy>
 <applicationtipolicy id="app002" isenabled="true">
 <identityKey id="BasicAuth">
<key id="Basic TXByoiKIOd8YPLiKjKNjEKsM6=">Api-test</key> <key  id="Basic yXByohKIYOPL8KEK7==">test< /key>
   < /identityKey>
  < /applicationtipolicy>
 < /enterprisetipolicy>
< /identity>
```

 Sample Response body:
```sh
{
    "APIDefenderResponse": {
        "Status": 200,
        "Message": "Success",
        "Details": "Upload successful."
    }
}
```
<a name="uploadCerts"></a>
## Step 3: Upload certificates
If you APIDomain is configured for HTTPS protocol (i.e target_port= 443 in API Domain config) then we need to upload ssl cert and key. If your target port is not 443 then you can skip this step.

API to add or update SSL Certificate and Key.

|API Params| Details|
|----------|-------|
|URL|/apidefender/apidomain/ssl-cert-key/:apidomainId|
|Method|POST|
|Request Headers | Authorization: Basic <auth token>|
|Request|SSL certificate and Key
|Response|Uploaded SSL certificate and key status message.|
|Curl command|curl -X POST https://{{your-mgt-server}}/apidefender/apidomain/SSLCertKey/{{your-apidomainId}}-H 'authorization: Basic {{token}}' -F certificate=@/var/local/myserver.crt  -F key=@/var/local/myserver.key|

Request body params:

|Param Name |Description |Required? |Example Value|
|-----------|------------|----------|-------------|
|certificate |SSL certificate for domain.|Yes |SSL Certificate|
|key |SSL key for domain.|Yes |SSL Key |

**Note:**
If you have two certificates i.e. one actual certificate and bundle certificate then you need to merge them first and upload the new merged certificate using SSL apidomain API.

Below is the command to merge these two certificates:
```sh
sudo cat original_certificate.crt bundle_certificate.crt > new_chained_certificate.crt
```
Success Response example:
Success if the SSL certificate and key are valid and key matches with the certificate provided.
```sh
{
“status”: “success”,
“statusCode”: “200”,
“message”: “SSL certificate and key uploaded”
}
```
Failure Response example:
Failure, if the certificate or key provided is not valid or the key does not match with the certificate provided.
```sh
{
“status”: “failure”,
“statusCode”: “403”,
“message”: “Adding SSL certificate and key failed, because the certificate or key provided is not valid”
}
```
<a name="uploadPolicy"></a>
## Step 4: Upload policy files for rules

API to add or update policy.

|API Params| Details|
|----------|-------|
|URL|/apidefender/policy|
|Method|POST|
|Request Headers |Authorization: Basic <auth token>|
|Request|A Policy file|
|Curl command|curl -X POST https://{{your-mgt-server}}/apidefender/policy -H 'authorization: Basic {{token}}=' -F files=@/var/local/policy.xml|

Sample Policy File:
```sh
<?xml version="1.0" encoding="UTF-8"?> <policy>
<enterprisetipolicy id="ent001" isenabled="true">
  <applicationtipolicy id="app001" isenabled="true">
   <ruleset id="rule1">
   <slot id="URL"/ > <filter				  regex="(\%27)|(\')|(\-\-)|(\%23)|(#)|((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))|\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\ %52))|((\%27)|(\'))union|((((\\+)|( )|(\\%2B)))*(((\%27)|(\\'))|union|select|delete|insert|or|alter|drop|and)(((\\+)|( )|(\\%2B))))"/ >
   <action type="block" count="" duration="" / >
   < /ruleset>
   <ruleset id="rule2">
   <slot id="BODY"/ > <filter regex="((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)|((\%3C)|<)((\%69)|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))[^\n]+((\ %3E)|>)|((\%3C)|<)[^\n]+((\%3E)>/ >
   <action type="block" count="" duration=""/ >
   < /ruleset>
   <ruleset id="rule3">
    <slot id="AUTH_HEADER" name="authorization" / >  <filter

regex="((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)|((\%3C)|<)((\%69)|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))[^\n]+((\ %3E)|>)|((\%3C)|<)[^\n]+((\%3E)|>)" / >
    <action type="block" count="" duration=""/ >
   < /ruleset>
   <externalsources>
    <name>CAPEC< /name>
       <name> CAPEC < /name>
   < /externalsources>
    <idsources>
     <name> SURBL < /name>
    < /idsources>
   < /applicationtipolicy>
 < /enterprisetipolicy>
< /policy>
```
 Sample Response body:
```sh
{
    "APIDefenderResponse": {
        "Status": 200,
        "Message": "Success",
        "Details": "Upload successful."
    }
}
```
<a name="realApiFlow"></a>
## Step 5: Check with real API flow.
As you have configured a API Domain to secure your Application APIs, now it’s to check with real API.

Your application API request will get formed as following:
```sh
 http or https ://{{your request_domain}}/{{request_path}}
 ```
For example:
In above API domain we have target port is 80, request domain is
ocs-test.mobileo2.com
and request path is
**^(\/ocs\/.{2,}[.]php\/apps\/files_sharing\/api\/.{2,}\/shares).***

So the expected request URL will be
http://ocs-test.mobileo2.com/ocs/v1.php/apps/files_sharing/api/v1/shares

Your API request will first goes to the API defender which applies some rule sets from policy file to inspect the incoming request, further forwards that request to target domain if its valid one and you will get the expected output from the specified target server.

## Postman Collection Link for APID

Import the following link into your postman client to use APID’s Management APIs:
**https://www.getpostman.com/collections/3a5e7121f4de3f860d6a**

## License

Apache License Version 2.0

https://www.apache.org/licenses/LICENSE-2.0

