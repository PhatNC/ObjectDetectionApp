const { Router } = require('express')
const passport = require('passport')
const { google } = require('googleapis')
const KEYS = require('../configs/keys')


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

        let { name: filename, mimetype, data } = req.files.file_upload

        // console.log(req);


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

        //console.log(driveResponse);

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

        console.log(file.data.webContentLink);

        try {
            if (driveResponse.status == 200) {
                res.send(file.data.webContentLink);
                //res.redirect('/dashboard?file=upload') // success
            }
            else {
                res.redirect('/dashboard?file=notupload') // unsuccess
            }
        } catch (error) {
            throw error;
        }
    }

    // driveResponse.then(data => {
    //     //console.log(data);
    //     if (data.status == 200) res.redirect('/dashboard?file=upload') // success
    //     else res.redirect('/dashboard?file=notupload') // unsuccess

    // }).catch(err => { throw new Error(err) })
})

router.get('/file', function (req, res) {
    //console.log(req);
    // drive.files.get({
    //     fileId: req.query.id,
    //     fields: 'webLinkView'
    //     }, function(err,result){
    //       if(err) console.log(err) 
    //       else console.log(result)
    //   });
})

module.exports = router

