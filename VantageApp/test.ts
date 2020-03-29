import Database from '../VantageLib/Database';
var database = new Database();
database.connect().then(() => {
    console.log('connected');
});