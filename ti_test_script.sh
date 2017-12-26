# Script to run the test cases
# Created by API Defender on 12/05/2016
# @version 1.0

mocha test/GeoIPUtils/InsecureOrigin.js
mocha test/IDServices/OAuthTest.js
mocha test/IDServices/BasicAuthTest.js
mocha test/RelayService/forwardRequestTest.js
mocha test/RelayService/validateRequestTest.js
mocha test/TrafficEnforcerController/RequestInspectionTest.js
mocha test/TrafficEnforcerController/ResponseInspectionTest.js


