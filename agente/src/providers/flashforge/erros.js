// Erros do provider, com um `codigo` que o sistema sabe traduzir em mensagens claras para o usuário.
//   offline    - não respondeu (desligada, IP trocado, rede)
//   credencial - número de série ou checkCode incorretos
//   lan        - a impressora está no modo "Cloud", com a API local desativada
//   firmware   - resposta inesperada (firmware diferente do mapeado pela documentação)
export class ErroImpressora extends Error {
  constructor(codigo, mensagem) {
    super(mensagem)
    this.name = 'ErroImpressora'
    this.codigo = codigo
  }
}
