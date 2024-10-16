import fs from 'fs'
import path from 'node:path'
import ffmpeg from 'fluent-ffmpeg'
import { Router } from 'express'
import { OpenAI } from 'openai'

export const voiceApiWeb = (ai: OpenAI) => {
  const router = Router()

  const audioFilePath = (name: string) => path.join(__dirname, 'voices', name) // Измените на путь к вашему аудиофайлу

  router.get('/getVoices', (req, res) => {
    const voicesName = fs.readdirSync(path.resolve(__dirname, './voices'))
    res.send(voicesName)
  })

  router.delete('/delete', (req, res) => {
    const directoryVoice = path.resolve(__dirname, './voices')
    const directoryResult = path.resolve(__dirname, './result')
    fs.rmSync(directoryVoice, { recursive: true, force: true })
    fs.mkdirSync(directoryVoice)
    fs.rmSync(directoryResult, { recursive: true, force: true })
    fs.mkdirSync(directoryResult)
  })

  router.get('/getVoices/name', (req, res) => {
    const audioFileName = String(req.headers.name)
    res.sendFile(audioFilePath(audioFileName), (err) => {
      if (err) {
        console.error('не получилось по имени', err)
      }
    })
  })

  router.get('/speechToText', async (req, res) => {
    const { text: trans } = await ai.audio.transcriptions.create({
      file: fs.createReadStream(path.resolve(__dirname, './result/result.mp3')),
      model: 'whisper-1',
    })
    res.send(trans)
    fs.writeFile(path.resolve(__dirname, './result/result.txt'), trans, (err) => {
      if (err) throw err
      console.log('File has been created and content has been written.')
    })
  })

  router.get('/brief', async (req, res) => {
    const trans = fs.readFileSync(path.resolve(__dirname, './result/result.txt'), 'utf-8')
    const summary = await ai.chat.completions.create({
      messages: [{ role: 'user', content: `Мне друг отправил сообщения, расскажи что он хотел мне сказать: ${trans}` }],
      model: 'gpt-3.5-turbo',
    })
    res.send(summary.choices[0].message.content || '')
  })

  router.get('/getSum', (req, res) => {
    const outputFile = path.resolve(__dirname, './result/result.mp3')

    if (!fs.existsSync(path.resolve(path.resolve(__dirname, './result')))) {
      fs.mkdirSync(path.resolve(path.resolve(__dirname, './result')), { recursive: true })
    }

    fs.readdir(path.resolve(__dirname, './voices'), (err, files) => {
      if (err) {
        console.error('Error reading directory: ' + err.message)
        return
      }

      // Фильтруем файлы, чтобы взять только аудиофайлы, например, mp3
      const audioFiles = files
        .filter((file) => path.extname(file).toLowerCase() === '.mp3') // фильтр по расширению .mp3
        .map((file) => path.join(path.resolve(__dirname, './voices'), file)) // полный путь к каждому файлу

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
          res.sendFile(path.resolve(__dirname, 'result/result.mp3'), (err) => {
            if (err) {
              console.error('не получилось целиком', err)
            }
          })
        })
        .mergeToFile(outputFile, './output')
    })
  })

  return router
}
