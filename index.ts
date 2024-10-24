import TelegramBot from 'node-telegram-bot-api'
import express from 'express'
import { OpenAI } from 'openai'
import cors from 'cors'
const dotenv = require('dotenv')
dotenv.config()
import * as https from 'https'
import * as fs from 'fs'
import * as process from 'process'
import installer from '@ffmpeg-installer/ffmpeg'
import ffmpeg from 'fluent-ffmpeg'
import { voiceApiTg } from './src/voiceApi/voiceApiTg'
// const { voiceApiTg } = require('./src/voiceApi/voiceApiTg')
import { voiceApiWeb } from './src/voiceApi/voiceApiWeb'
import { moodApi } from './src/moodApi/moodApi'
import { gipnofobApi } from './src/gipnofobApi/gipnofobApi'
ffmpeg.setFfmpegPath(installer.path)

const bot = new TelegramBot(process.env.TELEGRAM_TOKEN || '', {
  polling: true,
})

const app = express()

const IS_PROD = process.env.NODE_ENV === 'production'
const IS_SELF_SSL = process.env.SSL === 'true'
const PORT = IS_SELF_SSL ? process.env.PORT : process.env.LOCAL_PORT
const FRONT_URL = process.env.FRONT_URL

app.use(express.json())
app.use(cors())

const ai = new OpenAI({
  apiKey: process.env.GPT_TOKEN || '',
})

bot.on('text', (ctx) => {
  bot.sendMessage(ctx.chat.id, 'Приложение', {
    reply_markup: {
      inline_keyboard: [
        [{ text: 'Настроение', web_app: { url: `${FRONT_URL}/mood` } }],
        [{ text: 'Голосове', web_app: { url: `${FRONT_URL}/voice` } }],
        [{ text: 'Тапалка', web_app: { url: `${FRONT_URL}/gipnofob` } }],
      ],
    },
  })
})

voiceApiTg(bot, ai)
const routesVoice = voiceApiWeb(ai, IS_PROD)
const routesMood = moodApi(ai, IS_PROD)
const routesGipnofob = gipnofobApi(IS_PROD)

// Подключаем маршруты
app.use('/api/voice', routesVoice)
app.use('/api/mood', routesMood)
app.use('/api/gipnofob', routesGipnofob)

console.log('app running')

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  }),
)

// Обработка "preflight" запросов
app.options('*', cors()) // Для всех маршрутов

// Пример маршрута
app.get('/api/data', (req, res) => {
  res.json({ message: 'CORS и HTTPS работают!' })
})

app.get('/api/test', (req, res) => {
  res.send('hello')
})

if (!IS_SELF_SSL) {
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
}
