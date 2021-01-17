require('dotenv').config()
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const got = require('got')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const FormData = require('form-data')
const helpers = require('./helpers')
const util = require('util')
const readdir = util.promisify(fs.readdir)
const unlink = util.promisify(fs.unlink)

// parse request bodies (req.body)
app.use(bodyParser.urlencoded({ extended: true }))
app.use(express.static('public'))
app.use(bodyParser.json())
app.set('view engine', 'ejs')

var tags = []
var activeTag = ''
const PORT = process.env.PORT || 3000
const directory = 'public/img/uploads'

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/img/uploads')
    },

    // By default, multer removes file extensions so let's add them back
    filename: function (req, file, cb) {
        cb(
            null,
            file.fieldname + '-' + Date.now() + path.extname(file.originalname)
        )
    }
})

app.get('/', (req, res) => {
    res.render('index')
})

app.post('/upload', (req, res) => {
    // 'picture' is the name of our file input field in the HTML form
    let upload = multer({
        storage: storage,
        fileFilter: helpers.imageFilter
    }).single('picture')

    upload(req, res, function (err) {
        // req.file contains information of uploaded file
        // req.body contains information of text fields, if there were any

        if (req.fileValidationError) {
            return res.send(`<p>${req.fileValidationError} You will be redirected in 3 seconds</p>
      <script>
          var timer = setTimeout(function() {
            location.reload();
          }, 3000);
      </script>`)
        } else if (!req.file) {
            return res.send(`<p>Please select an image to upload! You will be redirected in 3 seconds</p>
      <script>
          var timer = setTimeout(function() {
            location.reload();
          }, 3000);
      </script>`)
        } else if (err instanceof multer.MulterError) {
            return res.send(err)
        } else if (err) {
            return res.send(err)
        }
        // Display uploaded image for user validation
        res.render('image', { filename: req.file.filename })
    })
})

app.get('/analyzeImage/:filename', (req, res) => {
    const filePath = `public/img/uploads/${req.params.filename}`
    const _filePath = fs.createReadStream(filePath)
    _filePath.on('error', (err) => {
        res.status(404).send('Opps : Something went wrong!')
        console.error(err)
    })
    const formData = new FormData()
    formData.append('image', _filePath)
    formData.append('limit', 3)
    const url_categorizer =
        'https://api.imagga.com/v2/categories/personal_photos'
    const url_tags = 'https://api.imagga.com/v2/tags'

    ;(async () => {
        try {
            const response = await got.post(url_tags, {
                body: formData,
                username: process.env.Imagga_API_Key,
                password: process.env.Imagga_API_Secret
            })
            if (response.body) {
                const data = JSON.parse(response.body)
                const _tags = data.result.tags
                tags = _tags.map((tag) => {
                    return tag.tag.en
                })
                res.redirect(`/gallery/${tags[0]}`)
            } else {
                res.status(404).send('Opps : Something went wrong!')
            }
        } catch (error) {
            console.log(error.response.body)
            res.status(404).send(error.response.body)
        }
    })()
})

app.get('/gallery/:tag', (req, res) => {
    activeTag = req.params.tag
    const unsplash_url = `https://api.unsplash.com/search/photos?client_id=${process.env.Unsplash_API_Key}&per_page=50&query=`

    ;(async () => {
        try {
            const response = await got(`${unsplash_url + req.params.tag}`)
            if (response.body) {
                const responseJSON = JSON.parse(response.body)
                const data = responseJSON.results
                let images = data.map((obj) => {
                    return {
                        regular: obj.urls.regular,
                        thumb: obj.urls.thumb,
                        tags: obj.tags
                    }
                })
                res.render('gallery', {
                    tags: tags,
                    images: images
                })
            } else {
                res.status(404).send('Opps : Something went wrong!')
            }
        } catch (error) {
            console.log(error.response.body)
            res.send(error.response.body)
        }
    })()
})

app.get('/galleryLoad/:page', (req, res) => {
    const unsplash_url = `https://api.unsplash.com/search/photos?client_id=${process.env.Unsplash_API_Key}&page=${req.params.page}&per_page=50&query=`
    ;(async () => {
        try {
            const response = await got(`${unsplash_url + activeTag}`)
            if (response.body) {
                const responseJSON = JSON.parse(response.body)
                const data = responseJSON.results
                let images = data.map((obj) => {
                    return {
                        regular: obj.urls.regular,
                        thumb: obj.urls.thumb,
                        tags: obj.tags
                    }
                })
                res.json({
                    images: images
                })
            } else {
                res.status(404).send('Opps : Something went wrong!')
            }
        } catch (error) {
            console.log(error.response.body)
            res.send(error.response.body)
        }
    })()
})

app.get('/analyzeColors/:filename', (req, res) => {
    const filePath = `public/img/uploads/${req.params.filename}`
    const _filePath = fs.createReadStream(filePath)
    _filePath.on('error', (err) => {
        res.status(404).send('Opps : Something went wrong!')
        console.error(err)
    })
    const formData = new FormData()
    formData.append('image', _filePath)
    // formData.append("limit", 3);

    const url_colors = 'https://api.imagga.com/v2/colors'

    ;(async () => {
        try {
            const response = await got.post(url_colors, {
                body: formData,
                username: process.env.Imagga_API_Key,
                password: process.env.Imagga_API_Secret
            })

            if (response.body) {
                const data = JSON.parse(response.body)
                const background_colors = data.result.colors.background_colors
                const foreground_colors = data.result.colors.foreground_colors
                const image_colors = data.result.colors.image_colors
                res.render('colors', {
                    filename: req.params.filename,
                    background_colors: background_colors,
                    foreground_colors: foreground_colors,
                    image_colors: image_colors
                })
            } else {
                res.status(404).send('Opps : Something went wrong!')
            }
        } catch (error) {
            console.log(error.response.body)
            res.send(error.response.body)
        }
    })()
})

async function clearDirectory() {
    try {
        const files = await readdir(directory)
        const unlinkPromises = files.map((filename) =>
            unlink(`${directory}/${filename}`)
        )
        return Promise.all(unlinkPromises)
    } catch (err) {
        console.log(err)
    }
}

setInterval(clearDirectory, 1800000) // clear uplaods folder every 30 mins

app.listen(PORT, () => {
    console.log(`Server runnning http://localhost:${PORT}`)
})
