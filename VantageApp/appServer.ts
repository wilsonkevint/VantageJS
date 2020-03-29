//appServer - starts web and web socket service
import Server from '../VantageLib/DataServer';
import DataServer from '../VantageLib/DataServer';


const server = new DataServer();
server.start();

// original comment 3.29