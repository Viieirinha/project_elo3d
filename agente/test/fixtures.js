// ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
// ║  FIXTURES NÃO VALIDADAS CONTRA HARDWARE.                                                         ║
// ║  Foram escritas a partir da documentação comunitária da API (github.com/Parallel-7/               ║
// ║  flashforge-api-docs, firmware AD5X 1.2.1), não de uma resposta real da impressora.               ║
// ║  Rode `npm run diagnostico` no notebook para comparar com o que a SUA AD5X devolve.               ║
// ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝

export const CHECK_CODE = 'a1b2c3d4'
export const SERIAL = 'SNADVXX0000001'

/** /detail de uma impressora ociosa. */
export const detalheOciosa = {
  status: 'ready', printFileName: '', printFileThumbUrl: '', printLayer: 0, targetPrintLayer: 0, printProgress: 0,
  printDuration: 0, estimatedTime: 0, errorCode: '',
  platTemp: 24.5, platTargetTemp: 0, leftTemp: 25.1, leftTargetTemp: 0, rightTemp: 0, rightTargetTemp: 0, chamberTemp: 0, chamberTargetTemp: 0,
  name: 'AD5X da oficina', macAddr: 'aa:bb:cc:dd:ee:ff', ipAddr: '192.168.0.50', flashRegisterCode: 'REGISTRO-SECRETO', polarRegisterCode: 'POLAR-SECRETO',
  cameraStreamUrl: 'http://192.168.0.50:8080/?action=stream', firmwareVersion: '1.2.1', location: 'Brasilia',
}

/** /detail durante a impressão. */
export const detalheImprimindo = {
  ...detalheOciosa, status: 'printing', printFileName: 'suporte_celular.gcode', printLayer: 42, targetPrintLayer: 200,
  printProgress: 0.21, printDuration: 1260, estimatedTime: 4740, platTemp: 60, platTargetTemp: 60, leftTemp: 219.8, leftTargetTemp: 220,
}

export const detalheConcluida = { ...detalheImprimindo, status: 'completed', printLayer: 200, printProgress: 1, printDuration: 6000, estimatedTime: 0, leftTargetTemp: 0, platTargetTemp: 0 }

/** Resposta da lista de arquivos com dados de filamento por ferramenta/slot do IFS. */
export const listaDeArquivos = [
  { gcodeFileName: 'outra_peca.gcode', printingTime: 1800, totalFilamentWeight: 4.2, useMatlStation: false, gcodeToolCnt: 1, gcodeToolDatas: [{ toolId: 0, materialName: 'PLA', materialColor: '#ffffff', filamentWeight: 4.2, slotId: 0 }] },
  {
    gcodeFileName: 'suporte_celular.gcode', printingTime: 6000, totalFilamentWeight: 31.7, useMatlStation: true, gcodeToolCnt: 2,
    gcodeToolDatas: [
      { toolId: 0, materialName: 'PLA', materialColor: '#ff0000', filamentWeight: 20.5, slotId: 1 },
      { toolId: 1, materialName: 'PETG', materialColor: '#00ff00', filamentWeight: 11.2, slotId: 3 },
    ],
  },
]

/** Envelope de sucesso da API (HTTP sempre 200). */
export const ok = (extra) => ({ code: 0, message: 'Success', ...extra })
