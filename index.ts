import TelegramBot from "node-telegram-bot-api";
import express from 'express'
import {OpenAI} from 'openai'
import cors from 'cors'
const dotenv =  require('dotenv')
dotenv.config()
import * as https from "https";
import * as fs from "fs";
import * as process from "process";
import axios from "axios";
import path from "node:path";
import installer from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'
ffmpeg.setFfmpegPath(installer.path)

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN || '',{polling: true})

const app = express()

const IS_PROD = process.env.NODE_ENV === 'production'
const PORT = IS_PROD ? process.env.PORT :  process.env.LOCAL_PORT
const FRONT_URL =  process.env.FRONT_URL

app.use(express.json())
app.use(cors())

const ai = new OpenAI({
    apiKey: process.env.GPT_TOKEN || '',
})

bot.on('voice', async (ctx) => {
    await bot.sendMessage(ctx.chat.id, 'Получил голосовое!')
    const id =  ctx.voice?.file_id || ''
    const url = await bot.getFileLink(id)
    const oggPath = path.resolve(__dirname, './voices', `${id}.oga`)
    const mp3Path = path.resolve(__dirname, './voices', `${id}.mp3`)
    const response = await axios({
        method: 'get',
        url,
        responseType: 'stream',
    })
        const stream = fs.createWriteStream(oggPath)
        response.data.pipe(stream)
        stream.on('finish', async () => {
            const outStream = fs.createWriteStream(mp3Path);
            const inStream = fs.createReadStream(oggPath);
            ffmpeg(inStream)
                .toFormat("mp3")
                .on('error', error => console.log(`Encoding Error: ${error.message}`))
                .on('end', () => {
                    bot.sendMessage(ctx.chat.id,'Сохранил')
                    fs.rmSync(oggPath, {
                        force: true,
                    });
                })
                .pipe(outStream, { end: true })
        })
})

bot.onText(new RegExp('^delete$', 'ig'), async (ctx) => {
    await bot.sendMessage(ctx.chat.id,'Удалил')
    const directoryVoice = path.resolve(__dirname, './voices')
    const directoryResult = path.resolve(__dirname, './result')
    fs.rmSync(directoryVoice, { recursive: true, force: true })
    fs.mkdirSync(directoryVoice)
    fs.rmSync(directoryResult, { recursive: true, force: true })
    fs.mkdirSync(directoryResult)
})

bot.onText(new RegExp('^decode$','ig'), async (ctx) => {
    const outputFile = './result/result.mp3';

    fs.readdir('./voices', (err, files) => {
        if (err) {
            console.error('Error reading directory: ' + err.message);
            return;
        }

        // Фильтруем файлы, чтобы взять только аудиофайлы, например, mp3
        const audioFiles = files
            .filter(file => path.extname(file).toLowerCase() === '.mp3') // фильтр по расширению .mp3
            .map(file => path.join('./voices', file)); // полный путь к каждому файлу

        if (audioFiles.length === 0) {
            console.log('No audio files found in the directory.');
            return;
        }

        const command = ffmpeg();
        audioFiles.forEach(file => {
            command.input(file);
        });
        command
            .on('error', (err) => {
                console.error('Error: ' + err.message);
            })
            .on('end', () => {
                bot.sendMessage(ctx.chat.id, 'Соединил');
                const voice = fs.readFileSync('./result/result.mp3')
                bot.sendVoice(ctx.chat.id, voice)

            })
            .mergeToFile(outputFile, './output');
    })
})

bot.onText(new RegExp('^trans$','ig'), async (ctx) => {
    const {text: trans} = await ai.audio.transcriptions.create({
        file: fs.createReadStream('./result/result.mp3'),
        model: 'whisper-1',
    })
    await bot.sendMessage(ctx.chat.id, trans)
    fs.writeFile('./result/result.txt', trans, (err) => {
        if (err) throw err;
        console.log('File has been created and content has been written.');
    });
})

bot.onText(new RegExp('^brief$','ig'), async (ctx) => {
    const trans = fs.readFileSync('./result/result.txt', 'utf-8')
    const summary = await ai.chat.completions.create({
        messages: [{ role: 'user', content: `Мне друг отправил сообщения, расскажи что он хотел мне сказать: ${trans}` }],
        model: 'gpt-3.5-turbo',
    })
    await bot.sendMessage(ctx.chat.id, summary.choices[0].message.content || '')
})

bot.on('text',  (ctx) => {
    bot.sendMessage(ctx.chat.id, 'Приложение', {
        reply_markup: {
            inline_keyboard: [
                [{text: 'Настроение', web_app: {url: `${FRONT_URL}/mood`}}],
                [{text: 'Голосове', web_app: {url: `${FRONT_URL}/voice`}}]
            ],
        }
    })
})

console.log('app running')

app.use(cors({
    origin: `${IS_PROD ? 'https://main--lbbttujj2.netlify.app/' : '*' } `,
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Обработка "preflight" запросов
app.options('*', cors()); // Для всех маршрутов

// Пример маршрута
app.get('/api/data', (req, res) => {
    res.json({ message: 'CORS и HTTPS работают!' });
});


app.post('/create-image', async (req, res) => {
    const {mood} = req.body
    console.log(mood)
    if(!IS_PROD) {
        res.send('https://steamuserimages-a.akamaihd.net/ugc/5103172932219996638/4FE828816AAF7B0660DD1BD7C94EBD54C68EF692/?imw=512&amp;&amp;ima=fit&amp;impolicy=Letterbox&amp;imcolor=%23000000&amp;letterbox=false')
    } else {
        const imageGPT = await ai.images.generate(
            {model: 'dall-e-3', prompt: `Сгенериуй эмоцию: ${mood}`, size: '1024x1024', quality: 'standard', n: 1}
        )
        res.send(imageGPT.data[0].url)
    }
})

app.get('/test', (req,res) => {
    res.send('hello')
})

if(!IS_PROD) {
    app.listen(PORT, () => {
        console.log('backend running port ', PORT)

    })
} else {
    const httpsOptions = {
        cert: fs.readFileSync('./certs/certificate.crt'),
        ca: fs.readFileSync('./certs/certificate_ca.crt'),
        key: fs.readFileSync('./certs/certificate.key'),
    }

    https.createServer(httpsOptions, app).listen(PORT)
    // 'lbbttujj.online'
}

//  "start": "cross-env NODE_ENV=production pm2 start index.ts",