# Script to download IP database
# Created by API Defender on 12/05/2016
# @version 1.0

#!/usr/bin/env bash
curl http://geolite.maxmind.com/download/geoip/database/GeoIPv6.dat.gz >./IpDatabase/GeoIPv6.dat.gz
curl http://geolite.maxmind.com/download/geoip/database/GeoLiteCountry/GeoIP.dat.gz >./IpDatabase/GeoIP.dat.gz
gzip -d -f ./IpDatabase/GeoIPv6.dat.gz
gzip -d -f ./IpDatabase/GeoIP.dat.gz