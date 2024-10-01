import TelegramBot from "node-telegram-bot-api";
import express from 'express'
import {OpenAI} from 'openai'
import cors from 'cors'

const bot = new TelegramBot('',{polling: true})

const app = express()

app.use(express.json())
app.use(cors())

const ai = new OpenAI({
    apiKey: '',
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


app.post('/create-image', async (req, res) => {
    const {mood} = req.body
    console.log(mood)
    // const chatCompletion = await ai.chat.completions.create({
    //     messages: [{ role: 'user', content: `Ответь "ок" если ты меня услышал` }],
    //     model: 'gpt-3.5-turbo',
    // })
    // res.send(chatCompletion.choices[0].message.content)
    const imageGPT = await ai.images.generate(
        {model: 'dall-e-3', prompt: `Сгенериуй эмоцию: ${mood}`, size: '1024x1024',quality: 'standard',n:1}
    )
    res.send(imageGPT.data[0].url)
})

app.get('/test', (req,res) => {
    res.send('hello')
})
const PORT = 443
app.listen(PORT, () => {
    console.log('backend running port ',PORT)

})
