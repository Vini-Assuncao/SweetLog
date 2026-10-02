# SweetLog — Migração para Tailwind CSS

## O que mudou

O front-end agora usa **Tailwind CSS** como motor de estilo. Para não quebrar
nada (o `js/app.js` depende de nomes de classe específicos como `.is-open`,
`.product-card`, `.drawer__link`, `[data-stepper]` etc.), a conversão foi
feita assim:

- **`tailwind.config.js`** — todas as cores, raios, sombras e fontes do
  projeto (antes em `:root` no `base.css`) viraram tokens do tema Tailwind
  (`primary`, `primary-dark`, `ink-muted`, `danger-soft`, `rounded-lg`...).
- **`src/styles.css`** — arquivo-fonte do Tailwind. Dentro de `@layer
  components` estão recriadas **todas as classes que o HTML e o `app.js` já
  usavam** (`.btn--primary`, `.topbar`, `.card`, `.product-card`,
  `.lotes-table`, etc.), só que agora implementadas com `@apply` + utilitários
  do Tailwind, em vez de CSS escrito à mão.
- **`css/build.css`** — o CSS final, gerado pelo Tailwind a partir do
  `src/styles.css`. É o único arquivo que os HTMLs carregam agora.
- **`css/legado/`** — os CSS antigos (`base.css`, `login.css`, `dashboard.css`
  etc.) foram movidos pra cá só como referência. Nenhum HTML os usa mais;
  pode apagar a pasta quando quiser.
- Os nomes de classe no HTML **não mudaram em nada** — o app continua
  funcionando exatamente igual, só a implementação do CSS é Tailwind agora.

## Como rodar

```bash
cd frontend
npm install        # instala o tailwindcss (já está no package.json)
npm run build:css  # gera css/build.css uma vez (minificado)
npm run watch:css   # gera e observa mudanças durante o desenvolvimento
```

Depois de editar `src/styles.css` ou `tailwind.config.js`, rode `npm run
build:css` de novo (ou deixe o `watch:css` rodando) para atualizar o
`css/build.css`.

## Próximos passos (opcional)

Hoje a conversão manteve a mesma arquitetura de classes (BEM-like) só que
implementada com Tailwind por baixo — é a forma mais segura de migrar um app
que já tem JS dependendo de nomes de classe. Se no futuro você quiser ir
além e escrever **utilitários diretamente no HTML** (o estilo "Tailwind
puro", tipo `class="flex items-center gap-2 bg-primary text-white..."`),
dá pra fazer isso tela por tela — me avise qual página quer converter
primeiro.
