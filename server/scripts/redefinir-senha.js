// Redefine a senha de um usuário direto no banco (para o administrador, no servidor).
// Útil quando o código de convite não está disponível ou o usuário perdeu o acesso.
//
//   read -rs NOVA_SENHA && export NOVA_SENHA     # digite a nova senha (não aparece na tela)
//   node scripts/redefinir-senha.js usuario@exemplo.com
//
// Precisa de DATABASE_URL (use o de /etc/elo3d/api.env). Encerra as sessões abertas desse usuário.
import bcrypt from 'bcryptjs'
import { pool } from '../src/db.js'

const email = (process.argv[2] ?? '').trim()
const novaSenha = process.env.NOVA_SENHA ?? ''

if (!email || novaSenha.length < 8) {
  console.error('Uso: NOVA_SENHA=<mínimo 8 caracteres> node scripts/redefinir-senha.js <e-mail>')
  process.exit(1)
}

try {
  const hash = await bcrypt.hash(novaSenha, 12)
  const r = await pool.query(
    'UPDATE usuarios SET senha_hash = $2, senha_alterada_em = now() WHERE lower(email) = lower($1) RETURNING email',
    [email, hash]
  )
  if (r.rowCount === 0) {
    console.error(`Nenhum usuário com o e-mail "${email}".`)
    process.exitCode = 1
  } else {
    console.log(`Senha de ${r.rows[0].email} redefinida. As sessões anteriores foram encerradas.`)
  }
} finally {
  await pool.end()
}
