const LIMITE_SEGURO_BYTES = 700_000

function redimensionar(dataUrl, maxDim, qualidade) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > height && width > maxDim) {
        height = Math.round((height * maxDim) / width)
        width = maxDim
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height)
        height = maxDim
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', qualidade))
    }
    img.onerror = () => reject(new Error('Não foi possível ler a imagem.'))
    img.src = dataUrl
  })
}

function lerComoDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo.'))
    reader.readAsDataURL(file)
  })
}

/**
 * Comprime uma foto de produto para caber com folga no limite de 1MB por
 * documento do Firestore. Tenta qualidades decrescentes até ficar dentro do
 * limite seguro; lança erro se nem a compressão mais agressiva for suficiente.
 */
export async function comprimirImagem(file) {
  const original = await lerComoDataUrl(file)

  const tentativas = [
    { maxDim: 900, qualidade: 0.75 },
    { maxDim: 700, qualidade: 0.6 },
    { maxDim: 500, qualidade: 0.5 },
  ]

  let resultado = original
  for (const { maxDim, qualidade } of tentativas) {
    resultado = await redimensionar(original, maxDim, qualidade)
    if (resultado.length <= LIMITE_SEGURO_BYTES) {
      return resultado
    }
  }

  throw new Error('Essa imagem é grande demais mesmo após compactar. Tente uma foto menor.')
}
