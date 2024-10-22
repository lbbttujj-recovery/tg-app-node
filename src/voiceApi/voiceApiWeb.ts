import fs from 'fs'
import path from 'node:path'
import ffmpeg from 'fluent-ffmpeg'
import { Router } from 'express'
import { OpenAI } from 'openai'

const mockText = {
  short: 'Перевел, распознал, все сделал',
  long: `Каждый новый день — это шаг в неизведанную вселенную возможностей. Ветер перемен шепчет нам о том, что границы реальности гибки, и всё зависит от нашего взгляда на мир. Солнце пробивается сквозь облака, и вместе с его лучами в нас вселяется сила. Сила не останавливаться, сила творить, изменять, воплощать самые смелые идеи в реальность.Мы — частицы этой огромной мозаики, где каждый элемент важен. И в этом постоянном движении мира, каждый наш шаг, каждый вдох — это новый мазок на полотне жизни. Каждый новый день — это шаг в неизведанную вселенную возможностей. Ветер перемен шепчет нам о том, что границы реальности гибки, и всё зависит от нашего взгляда на мир. Солнце пробивается сквозь облака, и вместе с его лучами в нас вселяется сила. Сила не о Каждый новый день — это шаг в неизведанную вселенную возможностей. Ветер перемен шепчет нам о том, что границы реальности гибки, и всё зависит от нашего взгляда на мир. Солнце пробивается сквозь облака, и вместе с его лучами в нас вселяется сила. Сила не о`,
}
export const voiceApiWeb = (ai: OpenAI, isProd: boolean) => {
  const router = Router()

  const audioFilePath = (name: string) => path.join(__dirname, 'voices', name) // Измените на путь к вашему аудиофайлу

  router.get('/getVoices', (req, res) => {
    const voicesName = fs.readdirSync(path.resolve(__dirname, './voices'))
    res.send(voicesName)
  })

  router.get('/getVoices/name', (req, res) => {
    const audioFileName = String(req.headers.name)
    res.sendFile(audioFilePath(audioFileName), (err) => {
      if (err) {
        console.error('не получилось по имени', err)
      }
    })
  })

  router.delete('/delete', (req, res) => {
    console.log('delete')
    try {
      const directoryVoice = path.resolve(__dirname, './voices')
      const directoryResult = path.resolve(__dirname, './result')
      fs.rmSync(directoryVoice, { recursive: true, force: true })
      fs.mkdirSync(directoryVoice)
      fs.rmSync(directoryResult, { recursive: true, force: true })
      fs.mkdirSync(directoryResult)
    } catch (e) {
      res.status(500).send(e)
    }
    res.send('success')
  })

  router.get('/speechToText', async (req, res) => {
    try {
      const { text: trans } = await ai.audio.transcriptions.create({
        file: fs.createReadStream(path.resolve(__dirname, './result/result.mp3')),
        model: 'whisper-1',
      })
      if (isProd) {
        res.send(trans)
      } else {
        setTimeout(() => {
          res.send(mockText.long)
        }, 500)
      }

      fs.writeFile(path.resolve(__dirname, './result/result.txt'), trans, (err) => {
        if (err) throw err
      })
    } catch (e) {
      res.status(500).send('Пусто')
    }
  })

  router.get('/brief', async (req, res) => {
    const trans = fs.readFileSync(path.resolve(__dirname, './result/result.txt'), 'utf-8')
    if (!isProd) {
      setTimeout(() => {
        res.send(mockText.short)
      }, 500)
    } else {
      try {
        const summary = await ai.chat.completions.create({
          messages: [
            {
              role: 'user',
              content: `Мне друг отправил сообщения, расскажи что он хотел мне сказать: ${trans}`,
            },
          ],
          model: 'gpt-3.5-turbo',
        })
        res.send(summary.choices[0].message.content || '')
      } catch (error) {
        console.error(error)
        res.send('error gpt')
      }
    }
  })

  router.get('/getSum', (req, res) => {
    const outputFile = path.resolve(__dirname, './result/result.mp3')
    console.log('sum')

    if (!fs.existsSync(path.resolve(path.resolve(__dirname, './result')))) {
      fs.mkdirSync(path.resolve(path.resolve(__dirname, './result')), { recursive: true })
    }

    fs.readdir(path.resolve(__dirname, './voices'), (err, files) => {
      if (err) {
        console.error('Error reading directory: ' + err.message)
        res.status(500).send(err.message)
        return
      }

      if (files.length) {
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
            res.sendStatus(500).send(err.message)
          })
          .on('end', () => {
            res.sendFile(path.resolve(__dirname, 'result/result.mp3'), (err) => {
              if (err) {
                console.error('не получилось целиком', err)
              }
            })
          })
          .mergeToFile(outputFile, './output')
      } else {
        res.status(500).send('no files')
      }
    })
  })

  return router
}
