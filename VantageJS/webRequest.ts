declare function require(name: string);
import * as Common from './Common';
var http = require('http');

export default class WebRequest {

        static get(host: string, path: string): any {
            var port = 80; 
            if (!path) {
                if (host.indexOf('/') > -1) {
                    path = host.substr(host.indexOf('/') - 1 + 1);
                    host = host.substr(0, host.indexOf('/'));
                }
                else
                    path = '/';

                if (host.indexOf(':') > -1) {
                    var parms = host.split(':'); 
                    host = parms[0];
                    port = parseInt(parms[1]);
                }

                
            }

            var options = {
                host: host,
                port: port,
                path: path,
                method: 'get',
                timeout: 4000
            }
                   
            var promise = new Promise( function(resolve, reject) {
                var resultData = '';

                try {
                    var request = http.request(options, function(response) {
                        response.on('data', function(chunk, len) {

                            resultData += String.fromCharCode.apply(null, chunk);
                            
                            if (resultData.length == this.headers['content-length'] || !this.headers['content-length'])
                                resolve(resultData);

                        });
                        response.on('timeout', function(socket) {
                            reject();
                        });
                        response.on('error', function(err) {
                            reject(err);
                        });
                    });

                    request.on('error', function(err) {
                        reject(err);
                    });

                    request.setTimeout(30000, function() {
                        reject('timeout');
                    });

                    request.end();

                }
                catch (ex) {
                    Common.Logger.info('getWebRequest exception');
                    Common.Logger.info(ex);
                    reject(ex);
                }
            });

            return promise;
    }
}