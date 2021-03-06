const mongo = require('mongodb').MongoClient;
const _ = require('lodash');
const HWSS_DB = 'HWSS';
const METADATA = 'METADATA';

// const HWSS_LOCAL = 'HWSS_LOCAL';
// const users = 'users';

function buildQuery(queryParams) {
    var query = {};
    query.$query = {};

    if (!queryParams.all && !queryParams.categories && !queryParams.uniqNames && !queryParams.uniqRegions
        && !queryParams.uniqInstruments && !queryParams.uniqSamplingRates) {
        if (queryParams.pis) {
            query.$query.pi = {
                $in: queryParams.pis
            }
        }
        if (queryParams.firstNames) {
            query.$query.firstName = {
                $in: queryParams.firstNames
            }
        }
        if (queryParams.regions) {
            query.$query.region = {
                $in: queryParams.regions
            }
        }
        if (queryParams.dates) {
            query.$query.date = {
                $in: queryParams.dates
            }
        }
        if (queryParams.fileTypes) {
            query.$query.dataType = {
                $in: queryParams.fileTypes
            }
        }
        if (queryParams.instruments) {
            query.$query.sensorName = {
                $in: queryParams.instruments
            }
        }
        if (queryParams.samplingRates) {
            query.$query.samplingRate = {
                $in: _.sortBy(queryParams.samplingRates).map(Number)
            }
        }
    }


    if (queryParams.uniqNames) {
        query = {$group: {_id: {lastName: '$pi', firstName: '$firstName'}}};
    }
    else if (queryParams.uniqRegions) {
        query = {$group: {_id: '$region'}};
    }
    else if (queryParams.uniqInstruments) {
        query = {$group: {_id: '$sensorName'}};
    }
    else if (queryParams.uniqSamplingRates) {
        query = {$group: {_id: '$samplingRate'}};
    }
    else if (queryParams.uniqFileTypes) {
        query = {$group: {_id: {image: '$image_url', audio: '$audio_url', video: '$video_url', file: '$file_url'}}};
    }

    console.log("outside query: ", query);

    return query;
}

function buildSort (queryParams) {
    let sortParam = {};
    if (queryParams.dateSort) {
        if (queryParams.dateSort === "new") {
            sortParam.date = -1;
            sortParam.time = -1;
        } else if (queryParams.dateSort === "old") {
            sortParam.date = 1;
            sortParam.time = 11;
        }
    }
    else {
        sortParam.date = -1;
        sortParam.time = -1;
    }

    console.log("outside sort: ", sortParam);

    return sortParam;

}

// function insertNewUser(dbName, dbCollection, email, callback) {
//     // connecting locally for now
//     new mongo.connect("mongodb://localhost:27017/HWSS_LOCAL", function(err, db){
//         if(err) {
//             callback("Unreachable Database", null);
//         }else {
//             var dbo = db.db(dbName);
//             console.log("@@@@@@@@@@@@!!!!!!!@@@@@########");
//             dbo.collection(dbCollection).find().toArray(function(err,result){
//                 console.log("result: ", result)
//             });
//         }
//     })
// }

//http://localhost:3009/query/metadata?pi=Seger,Faraon&firstName=Kerri,Conard
function queryMetaData(dbName, dbCollection, queryParams, callback) {
    //READ ONLY ACCESS
    new mongo('mongodb://hwssappmongodb.documents.azure.com:10255/?ssl=true', {
        auth: {
            user: 'hwssappmongodb',
            password: 'FXTP01Os5DuuNcze2ThkumUb7cZyzPFY6LmkUbLksBqVihT2j9rz0afe3hq6DH6tLIGp40hyeyWTVWFSztiINA=='
        }
    }).connect(function (err, db) {
        try {
            if (err) {
                callback("Unreachable Database", null);
            } else {

                var dbo = db.db(dbName);
                var query = buildQuery(queryParams);
                var sortParam = buildSort(queryParams);

                if (queryParams.all) {
                    dbo.collection(dbCollection).find().sort(sortParam).toArray(function (err, result) {
                        callback(err, result);
                    });
                }
                else if (queryParams.categories) {
                    dbo.collection(dbCollection).findOne().then(function (result) {
                        callback(err, Object.keys(result));
                    })
                }
                else if (queryParams.uniqNames) {
                    dbo.collection(dbCollection).aggregate([query]).toArray(function (err, result) {
                        var data = [];
                        result.forEach(function (curr) {
                            var temp = {};
                            temp.firstName = curr._id.firstName;
                            temp.lastName = curr._id.lastName;
                            data.push(temp)
                        });
                        callback(err, data);
                    });
                }
                else if (queryParams.uniqRegions || queryParams.uniqInstruments || queryParams.uniqSamplingRates) {
                    dbo.collection(dbCollection).aggregate([query]).toArray(function (err, result) {
                        var data = [];
                        result.forEach(function (curr) {
                            if (data.indexOf(curr._id) <= -1) {
                                data.push(curr._id);
                            }
                        });

                        if (queryParams.uniqRegions) {
                            data.unshift("regions")
                        }
                        else if (queryParams.uniqInstruments) {
                            data.unshift("instruments")
                        }
                        else {
                            data.unshift("samplingRates")
                        }

                        callback(err, data);
                    });
                }
                else {
                    if (Object.keys(query).length !== 0 || query.constructor !== Object) {
                        dbo.collection(dbCollection).find(query.$query).sort(sortParam).toArray(function (err, result) {
                            callback(err, result);
                        });
                    } else {
                        callback("Not Found", null);
                    }
                }
            }
        }
        finally {
            db.close();
        }
    });
}


module.exports = {
    METADATA: METADATA,
    HWSS_DB: HWSS_DB,
    // HWSS_LOCAL: HWSS_LOCAL,
    // users: users,
    queryMetaData: queryMetaData,
};