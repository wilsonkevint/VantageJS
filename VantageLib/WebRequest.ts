declare function require(name: string);
import * as Common from './Common';
import { request } from 'https';
import { join } from 'path';
const http = require('http');
const https = require('https');
const querystring = require('querystring'); 

export default class WebRequest {

    static get(host: string, path: string, args: object = null, timeout = 4000): Promise<any> {
            var port = 80; 
            var Http = http;
            if (!path) {
                if (host.indexOf('/') > -1) {
                    path = host.substr(host.indexOf('/') - 1 + 1);
                    host = host.substr(0, host.indexOf('/'));
                }
                else
                    path = '/';
            }

            if (args) {
                path += '?' + querystring.stringify(args);
            }
           

            if (host.indexOf(':') > -1) {
                var parms = host.split(':');
                host = parms[0];
                port = parseInt(parms[parms.length-1]);
                if (port == 443)
                    Http = https;
            }

            var options = {
                host: host,
                port: port,
                path: path,
                method: 'get',
                timeout: timeout
                //headers: {'content-type':'application/json'}
            }
                   
            let promise = new Promise<any>( function(resolve, reject) {
                var resultData = '';

                try {
                    var request = Http.request(options, function(response) {
                        response.on('data', function(chunk, len) {

                            resultData += String.fromCharCode.apply(null, chunk);                            
                            //if (resultData.length == this.headers['content-length'] || !this.headers['content-length'])
                                //resolve(resultData);

                        });
                        response.on('timeout', function(socket) {
                            reject('timeout');
                        });
                        response.on('error', function(err) {
                            reject(err);
                        });
                        response.on('end', () => {                          
                            resolve(resultData);
                        })
                    });

                    request.on('error', function(err) {
                        reject(err);
                    });
                    //request.setHeader('user-agent', 'Mozilla /5.0 (Compatible MSIE 9.0;Windows NT 6.1;WOW64; Trident/5.0)');
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