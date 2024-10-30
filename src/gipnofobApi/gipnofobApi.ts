import { Router } from 'express'
import Database from '../../dataBase/dataBase'

export const gipnofobApi = (isProd: boolean) => {
  const db = new Database()
  const router = Router()

  router.get('/getScore', async (req, res) => {
    const { id } = req.query
    console.log(id)
    db.getScore(Number(id))
      .then((score) => {
        const currentScore = score[0].score
        res.send(`${currentScore}`)
      })
      .catch((e) => {
        console.log(e)
        res.sendStatus(500)
      })
  })

  router.post('/save', async (req, res) => {
    const { score, id } = req.body
    console.log('score', score)
    console.log(id)
    db.saveUserScore({ id, score })
      .then(() => {
        res.send('ok')
      })
      .catch((e) => {
        res.sendStatus(500)
      })
  })

  router.post('/addUser', async (req, res) => {
    const { id } = req.body
    db.addUser({ id })
      .then(() => {
        res.send('ok')
        console.log('ok')
      })
      .catch((e) => {
        res.sendStatus(500)
      })
  })
  return router
}
