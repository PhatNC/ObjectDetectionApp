const { Router } = require('express')
const passport = require('passport')
var http = require("http");
var querystring = require("querystring")
const { google } = require('googleapis')
const KEYS = require('../configs/keys')

let url_share = "";
let model_name = '';
let type = '';

const router = Router()

router.get('/', function (req, res) {
    res.render('home.html', { 'title': 'Application Home' })
})

router.get('/dashboard', function (req, res) {

    // if not user
    if (typeof req.user == "undefined") res.redirect('/auth/login/google')
    else {

        let parseData = {
            title: 'DASHBOARD',
            googleid: req.user._id,
            name: req.user.name,
            avatar: req.user.pic_url,
            email: req.user.email
        }

        // if redirect with google drive response
        if (req.query.file !== undefined) {

            // successfully upload
            if (req.query.file == "upload") parseData.file = "uploaded"
            else if (req.query.file == "notupload") parseData.file = "notuploaded"
        }

        res.render('dashboard.html', parseData)
    }
})

router.post('/upload', async function (req, res) {

    // not auth
    if (!req.user) res.redirect('/auth/login/google')
    else {
        // auth user

        // config google drive with client token
        const oauth2Client = new google.auth.OAuth2()
        oauth2Client.setCredentials({
            'access_token': req.user.accessToken
        });

        const drive = google.drive({
            version: 'v3',
            auth: oauth2Client
        });

        //move file to google drive

        let { name: filename, mimetype, data } = req.files.file_upload;
        model_name = req.body.model_name;


        let driveResponse = await drive.files.create({
            requestBody: {
                name: filename,
                mimeType: mimetype
            },
            media: {
                mimeType: mimetype,
                body: Buffer.from(data).toString()
            }
        });
        await drive.permissions.create({
            fileId: driveResponse.data.id,
            resource: {
                role: "reader",
                type: "anyone",
                allowFileDiscovery: true
            }
        });

        let file = await drive.files.get({
            fileId: driveResponse.data.id,
            fields: '*' // to show every existing field
        });
        if (driveResponse.status == 200) {
            console.log(file.data.mimeType);
            console.log(model_name);

            switch (file.data.mimeType) {
                case "image/jpeg":
                    type = 'img';
                    break;
                case "video/mp4":
                    type = 'video';
                    break;
                default:
                    break;
            }

            if (type != '' && model_name != '') {
                var link = file.data.webContentLink.toString();
                let st = '"' + link + ',' + type + ',' + model_name + '"';
                url_share = st;
                // res.send(st);
                sendPackage();
                res.redirect('/dashboard?file=upload');
            }
        }
        else {
            res.redirect('/dashboard?file=notupload') // unsuccess
        }
    }
})


function sendPackage() {
    const net = require('net');
    const client = new net.Socket();

    const postData = querystring.stringify({
        link: url_share,
        type: "img",
        model: "yolo"
    });

    client.connect(50000, '171.244.21.155', () => {
        // callback, when connection successfull
        console.log('Send');
        client.write(postData);
    });
    client.on('data', (data) => {
        console.log('Reply');
        // callback, when app replies with data
    });
    client.on('close', (data) => {
        console.log('Closed');

        // callback, when socket is closed
    });
}

module.exports = router

