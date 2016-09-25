"use strict";
var Promise = require('promise');
var http = require('http');
var webRequest = (function () {
    function webRequest() {
    }
    webRequest.get = function (host, path) {
        if (!path) {
            path = host.substr(host.indexOf('/') - 1 + 1);
            host = host.substr(0, host.indexOf('/'));
        }
        var options = {
            host: host,
            port: 80,
            path: path,
            method: 'get',
            timeout: 4000
        };
        var promise = new Promise(function (resolve, reject) {
            var resultData = '';
            try {
                var request = http.request(options, function (response) {
                    response.on('data', function (chunk, len) {
                        resultData += String.fromCharCode.apply(null, chunk);
                        if (resultData.length == this.headers['content-length'])
                            resolve(resultData);
                    });
                    response.on('timeout', function (socket) {
                        reject();
                    });
                    response.on('error', function (err) {
                        reject(err);
                    });
                });
                request.on('error', function (err) {
                    reject(err);
                });
                request.setTimeout(30000, function () {
                    reject('timeout');
                });
                request.end();
            }
            catch (ex) {
                console.log('getWebRequest exception');
                console.log(ex);
                reject(ex);
            }
        });
        return promise;
    };
    return webRequest;
}());
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = webRequest;
//# sourceMappingURL=webRequest.js.map