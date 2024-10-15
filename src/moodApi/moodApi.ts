import { Router } from 'express'
import { OpenAI } from 'openai'

export const moodApi = (ai: OpenAI, isProd: boolean) => {
  const router = Router()
  router.post('/create-image', async (req, res) => {
    const { mood } = req.body
    console.log(mood)
    if (!isProd) {
      res.send(
        'https://steamuserimages-a.akamaihd.net/ugc/5103172932219996638/4FE828816AAF7B0660DD1BD7C94EBD54C68EF692/?imw=512&amp;&amp;ima=fit&amp;impolicy=Letterbox&amp;imcolor=%23000000&amp;letterbox=false',
      )
    } else {
      const imageGPT = await ai.images.generate({
        model: 'dall-e-2',
        prompt: `Сгенериуй эмоцию в виде котика: ${mood}`,
        size: '512x512',
        quality: 'standard',
        n: 1,
      })
      res.send(imageGPT.data[0].url)
    }
  })
  return router
}
