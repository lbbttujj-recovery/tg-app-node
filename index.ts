import TelegramBot from "node-telegram-bot-api";
import express from 'express'
import {OpenAI} from 'openai'
import cors from 'cors'
const dotenv =  require('dotenv')
dotenv.config()
import * as https from "https";
import * as fs from "fs";
import * as process from "process";

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN || '',{polling: true})

const app = express()

const IS_PROD = process.env.NODE_ENV === 'production'
const PORT = IS_PROD ? process.env.PORT :  process.env.LOCAL_PORT

app.use(express.json())
app.use(cors())

const ai = new OpenAI({
    apiKey: process.env.GPT_TOKEN || '',
})

bot.on('message',  (ctx) => {
    bot.sendMessage(ctx.chat.id, 'Приложение', {
        reply_markup: {
            inline_keyboard: [
                [{text: 'ddd', web_app: {url: 'https://main--lbbttujj2.netlify.app/'}}]
            ]
        }
    })
})

console.log('app running')

app.use(cors({
    origin: `${IS_PROD ? 'https://main--lbbttujj2.netlify.app/' : '*' } `, // Укажите ваш фронтенд-домен
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
        const chatCompletion = await ai.chat.completions.create({
            messages: [{role: 'user', content: `Ответь "ок" если ты меня услышал`}],
            model: 'gpt-3.5-turbo',
        })
        res.send(chatCompletion.choices[0].message.content)
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