const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const credentionals = {
    login: 'dtaranin@vipcoingold.com',
    password: 'VipC0inG0ld2020',
    projectUuid: '3c1308b2-ff5b-4f45-a607-522dcbf30c4b',
    host: 'https://api.translate.center',
};

const login = credentionals.login;
const password = credentionals.password;
const projectUuid = credentionals.projectUuid;
const host = credentionals.host;
const action = process.env.TC_ACTION;
const actionUploadAllLang = process.env.TC_UPLOAD_ALL_LANG === 'true';

let authToken = null;

const instance = axios.create({
    baseURL: host + '/api/v1',
});
instance.defaults.headers.common = {};

const authorize = async() => {
    return instance
        .post('/login', {
            login: login,
            password: password,
        })
        .then(function(response) {
            authToken = response.data.authToken;
            instance.defaults.headers.common.authorization = authToken;
        });
};

const walkDir = async(dir, fileList = []) => {
    const files = await fs.readdir(dir);
    for (const file of files) {
        const stat = await fs.stat(path.join(dir, file));
        if (stat.isDirectory())
            fileList = await walkDir(path.join(dir, file), fileList);
        else fileList.push(path.join(dir, file));
    }
    return fileList;
};

const getKeys = (value, path = [], keys = []) => {
    Object.keys(value).forEach(key => {
        if (typeof value[key] === 'object') {
            keys = getKeys(value[key], [].concat(path, [key]), keys);
        } else if (value[key]) {
            keys.push({ key: [].concat(path, [key]).join('.'), value: value[key] });
        }
    });

    return keys;
};

const translateGetProjectsLanguages = async() => {
    const params = {
        pageNum: 1,
    };
    const fetch = async() => {
        process.stdout.write('.');
        return instance
            .get(`/projects/${projectUuid}/languages`, { params: params })
            .then(response => response.data);
    };
    let result = [];

    response = await fetch();
    result = result.concat(response.items.map(item => item.code));

    while (response.meta.totalPages > response.meta.pageNum) {
        params.pageNum++;
        response = await fetch();
        result = result.concat(response.items.map(item => item.code));
    }
    return result;
};

const translateGetProjectsResources = async langs => {
    const result = {};

    const params = {
        langs: langs,
        pageNum: 1,
        pageSize: 500,
        isApproved: true,
        skipVersionChecking: true,
    };
    const fetch = async() => {
        process.stdout.write('.');
        return instance
            .get(`/projects/${projectUuid}/resources`, { params: params })
            .then(response => response.data);
    };
    const processResponseItems = items => {
        items.forEach(item => {
            result[item.key] = item.value;
        });
    };

    response = await fetch();
    processResponseItems(response.items);

    while (response.meta.totalPages > response.meta.pageNum) {
        params.pageNum++;
        response = await fetch();
        processResponseItems(response.items);
    }
    return result;
};

const saveResources = async(resources, srcPath) => {
    for (let item in resources) {
        const fileName = srcPath + '/' + resources[item].file;
        const json = JSON.stringify(resources[item].data, null, '  ');
        await fs.writeFile(fileName, json);
    }
};

const basePath = path.normalize(__dirname + '/src/assets/locales');

const startProcessDate = new Date();
authorize()
    .then(async() => {
        switch (action) {
            case 'upload':
                const languageCodes = ['ru']
                    .concat(
                        (await fs.readdir(basePath))
                        .map(item => path.parse(item).name)
                        .filter(item => item !== 'ru')
                    )
                    .filter(item => {
                        return actionUploadAllLang || item === 'ru';
                    });

                for (let languageCode of languageCodes) {
                    const srcPath = basePath + '/' + languageCode + '/translation.json';

                    const startDate = new Date();
                    const json = require(srcPath);
                    const resources = getKeys(json);

                    await instance
                        .post(
                            `/projects/${projectUuid}/${languageCode}/resources`,
                            resources
                        )
                        .then(result => {
                            return result;
                        })
                        .catch(error => {
                            console.error(
                                `upload: ${srcPath}  keys: ${resources.length} time: ${
                  (new Date() - startDate) / 1000
                }`
                            );
                            console.error(error.response.data);
                            throw error;
                        });
                }
                break;
            case 'download':
                await translateGetProjectsLanguages().then(async languageCodes => {
                    for (let languageCode of languageCodes) {
                        const resources = await translateGetProjectsResources(languageCode);
                        const fileName = basePath + '/' + languageCode + '/translation.json';
                        const folderPath = basePath + '/' + languageCode;
                        await fs.mkdir(folderPath, { recursive: true }, function(err) {
                            if (err) return cb(err);
                        });
                        await fs.writeFile(fileName, JSON.stringify(resources, null, '  '));
                    }
                });
                break;

            default:
                throw new Error(`unknown action: ${action}`);
        }
    })
    .then(function() {
        process.exit(0);
    })
    .catch(function(error) {
        console.error(error);
        process.exit(-1);
    });