import { Router } from 'express'
import fs from 'fs'
import path from 'node:path'

export const gipnofobApi = (isProd: boolean) => {
  const router = Router()
  router.get('/getScore', async (req, res) => {
    try {
      const asd = fs.readFileSync(path.resolve(__dirname, './save.txt'), 'utf-8')
      res.send(asd)
    } catch (e) {
      res.sendStatus(500)
    }
  })
  router.post('/save', async (req, res) => {
    const { score } = req.body
    try {
      fs.writeFile(path.resolve(__dirname, './save.txt'), score + '', (err) => {
        res.send('ok')
        console.log('ok')
        if (err) throw err
        console.log('score written')
      })
    } catch (e) {
      res.sendStatus(500)
    }
  })
  return router
}
