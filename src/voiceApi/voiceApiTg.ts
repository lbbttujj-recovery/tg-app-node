import fs from 'fs'
import path from 'node:path'
import ffmpeg from 'fluent-ffmpeg'
import TelegramBot from 'node-telegram-bot-api'
import { OpenAI } from 'openai'
import axios from 'axios'

export const voiceApiTg = (bot: TelegramBot, ai: OpenAI) => {
  bot.on('voice', async (ctx) => {
    await bot.sendMessage(ctx.chat.id, 'Получил голосовое!')
    const id = ctx.voice?.file_id || ''
    const url = await bot.getFileLink(id)
    const oggPath = path.resolve(__dirname, './voices', `${id}.oga`)
    const mp3Path = path.resolve(__dirname, './voices', `${id}.mp3`)
    const response = await axios({
      method: 'get',
      url,
      responseType: 'stream',
    })
    if (!fs.existsSync('./voices')) {
      fs.mkdirSync(path.resolve(__dirname, './voices'), { recursive: true })
    }
    const stream = fs.createWriteStream(oggPath)
    response.data.pipe(stream)
    stream.on('finish', async () => {
      const outStream = fs.createWriteStream(mp3Path)
      const inStream = fs.createReadStream(oggPath)
      ffmpeg(inStream)
        .toFormat('mp3')
        .on('error', (error) => console.log(`Encoding Error: ${error.message}`))
        .on('end', () => {
          bot.sendMessage(ctx.chat.id, 'Сохранил')
          fs.rmSync(oggPath, {
            force: true,
          })
        })
        .pipe(outStream, { end: true })
    })
  })

  bot.onText(new RegExp('^decode$', 'ig'), async (ctx) => {
    const outputFile = './result/result.mp3'

    fs.readdir(path.resolve(__dirname, './voices'), (err, files) => {
      if (err) {
        console.error('Error reading directory: ' + err.message)
        return
      }

      // Фильтруем файлы, чтобы взять только аудиофайлы, например, mp3
      const audioFiles = files
        .filter((file) => path.extname(file).toLowerCase() === '.mp3') // фильтр по расширению .mp3
        .map((file) => path.join('./voices', file)) // полный путь к каждому файлу

      if (audioFiles.length === 0) {
        console.log('No audio files found in the directory.')
        return
      }

      const command = ffmpeg()
      audioFiles.forEach((file) => {
        command.input(file)
      })
      command
        .on('error', (err) => {
          console.error('Error: ' + err.message)
        })
        .on('end', () => {
          bot.sendMessage(ctx.chat.id, 'Соединил')
          const voice = fs.readFileSync('./result/result.mp3')
          bot.sendVoice(ctx.chat.id, voice)
        })
        .mergeToFile(outputFile, './output')
    })
  })

  bot.onText(new RegExp('^trans$', 'ig'), async (ctx) => {
    const { text: trans } = await ai.audio.transcriptions.create({
      file: fs.createReadStream('./result/result.mp3'),
      model: 'whisper-1',
    })
    await bot.sendMessage(ctx.chat.id, trans)
    fs.writeFile('./result/result.txt', trans, (err) => {
      if (err) throw err
      console.log('File has been created and content has been written.')
    })
  })

  bot.onText(new RegExp('^delete$', 'ig'), async (ctx) => {
    const directoryVoice = path.resolve(__dirname, './voices')
    const directoryResult = path.resolve(__dirname, './result')
    fs.rmSync(directoryVoice, { recursive: true, force: true })
    fs.mkdirSync(directoryVoice)
    fs.rmSync(directoryResult, { recursive: true, force: true })
    fs.mkdirSync(directoryResult)
    await bot.sendMessage(ctx.chat.id, 'Удалено')
  })

  bot.onText(new RegExp('^brief$', 'ig'), async (ctx) => {
    const trans = fs.readFileSync('./result/result.txt', 'utf-8')
    const summary = await ai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: `Мне друг отправил сообщения, расскажи что он хотел мне сказать: ${trans}`,
        },
      ],
      model: 'gpt-3.5-turbo',
    })
    await bot.sendMessage(ctx.chat.id, summary.choices[0].message.content || '')
  })
}

// exports.voiceApiTg = voiceApiTg
